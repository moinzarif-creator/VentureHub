const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Pitch = require('../models/Pitch');
const User = require('../models/User'); // ADDED User
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../utils/socketManager');
const { notifyFollowers, notifyInvestorFOMO } = require('../utils/trackingNotifications');

// @route   POST /api/comments
// @desc    Add a comment to a pitch
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { text, pitchId } = req.body;

        if (!text || !pitchId) {
            return res.status(400).json({ message: 'Please provide text and pitchId' });
        }

        const newComment = new Comment({
            text,
            author: req.user.id,
            pitchId
        });

        let savedComment = await newComment.save();

        // Populate the author's name and role before returning the newly created comment
        savedComment = await savedComment.populate('author', 'name role');

        const pitch = await Pitch.findById(pitchId);
        const actorName = savedComment.author ? savedComment.author.name : 'Someone';
        const commentPreview = text.length > 50 ? `${text.substring(0, 50)}...` : text;

        if (pitch) {
            createNotification(
                req.user.id,
                pitch.entrepreneurId,
                'comment',
                pitch._id,
                `${actorName} commented on your pitch: '${commentPreview}'`
            );

            // Notify followers (standard)
            setImmediate(() => {
                notifyFollowers(pitch._id, req.user.id, actorName, 'comment', 'just commented on');
            });

            // Trigger FOMO Logic (Investors only)
            setImmediate(() => {
                const actorRole = savedComment.author ? savedComment.author.role : 'Public';
                notifyInvestorFOMO(pitch._id, req.user.id, actorName, actorRole, text);
            });
        }

        res.status(201).json(savedComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Server error adding comment' });
    }
});

// @route   GET /api/comments/pitch/:pitchId
// @desc    Get all comments for a specific pitch
// @access  Private
router.get('/pitch/:pitchId', authMiddleware, async (req, res) => {
    try {
        const comments = await Comment.find({ pitchId: req.params.pitchId })
            .populate('author', 'name role')
            .sort({ createdAt: 1 }); // Oldest to newest

        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Server error fetching comments' });
    }
});

module.exports = router;
