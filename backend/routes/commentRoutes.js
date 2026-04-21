const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const authMiddleware = require('../middleware/authMiddleware');

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
