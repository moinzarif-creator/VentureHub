const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const authMiddleware = require('../middleware/authMiddleware');
const Pitch = require('../models/Pitch');
const User = require('../models/User'); // ADDED User
const { createNotification } = require('../utils/socketManager');
const { checkDirectSynergy } = require('../utils/synergyNotifications');
const { notifyFollowers } = require('../utils/trackingNotifications');
const generateEmbedding = require('../utils/generateEmbedding');

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'venturehive_pitches',
        allowed_formats: ['jpg', 'jpeg', 'png', 'mp4', 'mov', 'avi'],
        resource_type: 'auto' // automatically detect if image or video
    }
});
const upload = multer({ storage });

// @route   POST /api/pitches
// @desc    Create a new pitch with media uploads
// @access  Private (Entrepreneurs only)
router.post('/', authMiddleware, upload.array('media', 5), async (req, res) => {
    try {
        const { title, category, problem, solution, askAmount, equityOffered, isPrivate, tags } = req.body;

        // Extract uploaded file URLs
        const mediaUrls = req.files ? req.files.map(file => file.path) : [];

        // Validation
        if (!title || !category || !problem || !solution || !askAmount || !equityOffered) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Parse tags from comma separated string if applicable
        let parsedTags = [];
        if (typeof tags === 'string') {
            parsedTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } else if (Array.isArray(tags)) {
            parsedTags = tags;
        }

        // Generate Embedding for AI Search
        const textToEmbed = `${title} ${category} ${problem} ${solution} ${parsedTags.join(' ')}`;
        const embedding = await generateEmbedding(textToEmbed);

        // Create Pitch
        const newPitch = new Pitch({
            entrepreneurId: req.user.id,
            title,
            category,
            content: {
                problem,
                solution,
                mediaUrls
            },
            financials: {
                askAmount: Number(askAmount),
                equityOffered: Number(equityOffered),
                isPrivate: isPrivate === 'true' || isPrivate === true
            },
            tags: parsedTags,
            embedding
        });

        const savedPitch = await newPitch.save();

        // Synergy notification (Layer 2) - run asynchronously
        setImmediate(() => {
            checkDirectSynergy(savedPitch._id);
        });

        res.status(201).json(savedPitch);
    } catch (error) {
        console.error('Error creating pitch:', error);
        res.status(500).json({ message: 'Server Error creating pitch' });
    }
});

// @route   GET /api/pitches/mine
// @desc    Get user's own pitches
// @access  Private
router.get('/mine', authMiddleware, async (req, res) => {
    try {
        const pitches = await Pitch.find({ entrepreneurId: req.user.id })
            .sort({ createdAt: -1 });
        res.json(pitches);
    } catch (error) {
        console.error('Error fetching user pitches:', error);
        res.status(500).json({ message: 'Server Error fetching pitches' });
    }
});

// @route   GET /api/pitches
// @desc    Get all pitches with search and filter
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, minAsk, maxAsk, tag, category } = req.query;
        let query = {};

        let queryEmbedding = [];
        let vectorSearchMode = false;

        // 1. Keyword Search (AI Semantic Search fallback to Fuzzy Text)
        if (search) {
            queryEmbedding = await generateEmbedding(search);
            if (queryEmbedding && queryEmbedding.length > 0) {
                vectorSearchMode = true;
            } else {
                // Fuzzy fallback using regex
                const fuzzySearch = search.split(' ').join('.*');
                query.$or = [
                    { title: { $regex: fuzzySearch, $options: 'i' } },
                    { 'content.problem': { $regex: fuzzySearch, $options: 'i' } },
                    { 'content.solution': { $regex: fuzzySearch, $options: 'i' } },
                    { tags: { $regex: fuzzySearch, $options: 'i' } }
                ];
            }
        }

        // 2. Financial Filter (Ask Amount)
        if (minAsk || maxAsk) {
            query['financials.askAmount'] = {};
            if (minAsk) query['financials.askAmount'].$gte = Number(minAsk);
            if (maxAsk) query['financials.askAmount'].$lte = Number(maxAsk);
        }

        // 3. Category Filter (Supports Array/Multi-select)
        if (category) {
            const categories = Array.isArray(category) ? category : category.split(',');
            query.category = { $in: categories };
        }

        // 4. Tag Filter
        if (tag) {
            query.tags = { $regex: new RegExp(`^${tag}$`, 'i') };
        }

        // 5. Equity Range Filter
        const { minEquity, maxEquity } = req.query;
        if (minEquity || maxEquity) {
            query['financials.equityOffered'] = {};
            if (minEquity) query['financials.equityOffered'].$gte = Number(minEquity);
            if (maxEquity) query['financials.equityOffered'].$lte = Number(maxEquity);
        }

        let pitches = await Pitch.find(query)
            .populate('entrepreneurId', 'name');

        if (vectorSearchMode) {
            const cosineSimilarity = (vecA, vecB) => {
               if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
               let dotProduct = 0;
               let normA = 0;
               let normB = 0;
               for (let i = 0; i < vecA.length; i++) {
                   dotProduct += vecA[i] * vecB[i];
                   normA += vecA[i] * vecA[i];
                   normB += vecB[i] * vecB[i];
               }
               if (normA === 0 || normB === 0) return 0;
               return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
            };

            pitches = pitches.map(p => {
               const pitchObj = p.toObject();
               pitchObj.similarity = cosineSimilarity(queryEmbedding, p.embedding);
               return pitchObj;
            });

            pitches = pitches.filter(p => p.similarity > 0.25)
                             .sort((a, b) => b.similarity - a.similarity);
        } else {
            pitches.sort((a, b) => b.createdAt - a.createdAt);
        }

        res.json(pitches);
    } catch (error) {
        console.error('Error fetching pitches:', error);
        res.status(500).json({ message: 'Server Error fetching pitches' });
    }
});

// @route   PUT /api/pitches/:id/like
// @desc    Like or Unlike a pitch
// @access  Private
router.put('/:id/like', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.isPhoneVerified) {
            return res.status(403).json({ message: 'Please verify your phone number to like pitches' });
        }

        const pitch = await Pitch.findById(req.params.id);

        if (!pitch) {
            return res.status(404).json({ message: 'Pitch not found' });
        }

        // Check if the pitch has already been liked by this user
        // pitch.likes is an array of ObjectIds, so we map them to strings to compare
        if (pitch.likes.filter(like => like.toString() === req.user.id).length > 0) {
            // Get remove index and remove the like
            const removeIndex = pitch.likes.map(like => like.toString()).indexOf(req.user.id);
            pitch.likes.splice(removeIndex, 1);
            await pitch.save();
            res.json(pitch.likes);
        } else {
            // Add user to likes array
            pitch.likes.unshift(req.user.id);
            await pitch.save();

            // Explicitly fetch the user to get their name
            const actor = await User.findById(req.user.id);
            const actorName = actor ? actor.name : 'Someone';

            // Send notification to pitch owner
            createNotification(
                req.user.id, // sender
                pitch.entrepreneurId, // receiver
                'like',
                pitch._id,
                `${actorName} liked your pitch: ${pitch.title}`
            );

            // Notify followers
            setImmediate(() => {
                notifyFollowers(pitch._id, req.user.id, actorName, 'like', 'just liked');
            });

            res.json(pitch.likes);
        }
    } catch (error) {
        console.error('Error liking pitch:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Pitch not found' });
        }
        res.status(500).json({ message: 'Server Error processing like' });
    }
});

// @route   GET /api/pitches/:id
// @desc    Get a single pitch by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const pitch = await Pitch.findById(req.params.id).populate('entrepreneurId', 'name email');
        if (!pitch) {
            return res.status(404).json({ message: 'Pitch not found' });
        }
        res.json(pitch);
    } catch (error) {
        console.error('Error fetching pitch by ID:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Pitch not found' });
        }
        res.status(500).json({ message: 'Server Error fetching pitch' });
    }
});

// @route   PUT /api/pitches/:id
// @desc    Update a pitch
// @access  Private (Owner only)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        let pitch = await Pitch.findById(req.params.id);
        if (!pitch) return res.status(404).json({ message: 'Pitch not found' });

        // Check ownership
        if (pitch.entrepreneurId.toString() !== req.user.id) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const { title, category, problem, solution, askAmount, equityOffered, tags } = req.body;

        // Update fields
        if (title) pitch.title = title;
        if (category) pitch.category = category;
        if (problem) pitch.content.problem = problem;
        if (solution) pitch.content.solution = solution;
        if (askAmount) pitch.financials.askAmount = Number(askAmount);
        if (equityOffered) pitch.financials.equityOffered = Number(equityOffered);
        if (tags) {
            pitch.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
        }

        const updatedPitch = await pitch.save();

        // Notify Followers
        const actor = await User.findById(req.user.id);
        const actorName = actor ? actor.name : 'The founder';

        setImmediate(() => {
            notifyFollowers(
                pitch._id, 
                req.user.id, 
                actorName, 
                'update', 
                `updated their pitch: "${pitch.title}". Check out the new details!`
            );
        });

        res.json(updatedPitch);
    } catch (error) {
        console.error('Error updating pitch:', error);
        res.status(500).json({ message: 'Server Error updating pitch' });
    }
});

module.exports = router;
