const User = require('../models/User');
const InvestorProfile = require('../models/InvestorProfile');
const EntrepreneurProfile = require('../models/EntrepreneurProfile');
const generateEmbedding = require('../utils/generateEmbedding');


// GET /api/profiles/me
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        let profile = null;
        if (user.role === 'Investor') {
            profile = await InvestorProfile.findOne({ user: req.user.id });
        } else if (user.role === 'Entrepreneur') {
            profile = await EntrepreneurProfile.findOne({ user: req.user.id });
        }

        res.json({ user, profile });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// PUT /api/profiles/me
exports.updateMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const role = user.role;
        let updateData = { ...req.body };

        // Handle uploaded files
        if (req.files) {
            if (req.files.avatar && req.files.avatar.length > 0) {
                updateData.avatarUrl = req.files.avatar[0].path;
            }
            if (req.files.logo && req.files.logo.length > 0) {
                updateData.logoUrl = req.files.logo[0].path;
            }
            if (req.files.pitchDeck && req.files.pitchDeck.length > 0) {
                updateData.pitchDeckUrl = req.files.pitchDeck[0].path;
            }
        }

        let profile;
        let embeddingText = "";
        
        if (role === 'Investor') {
            if (typeof updateData.preferredIndustries === 'string') {
                updateData.preferredIndustries = updateData.preferredIndustries.split(',').map(s => s.trim()).filter(s => s);
            }
            
            embeddingText = `Investor dealing with ${updateData.preferredIndustries?.join(', ')} focusing on ${updateData.investmentThesis || ''}`;
            const embeddingVector = await generateEmbedding(embeddingText);
            if (embeddingVector && embeddingVector.length > 0) {
                updateData.embedding = embeddingVector;
            }

            profile = await InvestorProfile.findOneAndUpdate(
                { user: req.user.id },
                { $set: updateData },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        } else if (role === 'Entrepreneur') {
            embeddingText = `${updateData.companyName || ''} startup at ${updateData.startupStage || ''} stage seeking $${updateData.fundingGoal || ''}`;
            const embeddingVector = await generateEmbedding(embeddingText);
            if (embeddingVector && embeddingVector.length > 0) {
                updateData.embedding = embeddingVector;
            }

            profile = await EntrepreneurProfile.findOneAndUpdate(
                { user: req.user.id },
                { $set: updateData },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        } else {
            return res.status(400).json({ message: 'User role does not support profiles' });
        }

        res.json({ user, profile });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).send('Server Error');
    }
};

// GET /api/profiles/public/:userId
exports.getPublicProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('name role createdAt');
        if (!user) return res.status(404).json({ message: 'User not found' });

        let profile = null;
        if (user.role === 'Investor') {
            profile = await InvestorProfile.findOne({ user: req.params.userId });
        } else if (user.role === 'Entrepreneur') {
            profile = await EntrepreneurProfile.findOne({ user: req.params.userId });
        }

        res.json({ user, profile });
    } catch (err) {
        console.error(err);
        if (err.kind === 'ObjectId') {
             return res.status(404).json({ message: 'User not found' });
        }
        res.status(500).send('Server Error');
    }
};
