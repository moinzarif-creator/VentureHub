const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Message = require('../models/Message');

// @route   GET /api/messages/conversations
// @desc    Get all unique active conversations for the logged-in user
// @access  Private
router.get('/conversations', authMiddleware, async (req, res) => {
    try {
        const currentUserId = req.user.id;

        // Find all messages where user is involved, sort by newest
        const messages = await Message.find({
            $or: [{ sender: currentUserId }, { receiver: currentUserId }]
        })
        .sort({ createdAt: -1 })
        .populate('sender', 'name role')
        .populate('receiver', 'name role');

        const conversationsMap = new Map();

        messages.forEach(msg => {
            // Determine who the "other" person is
            const isSender = msg.sender._id.toString() === currentUserId;
            const otherUser = isSender ? msg.receiver : msg.sender;

            const otherUserId = otherUser._id.toString();

            // Maps maintain insertion order. Because we sorted descending, 
            // the first time we see an otherUserId, it's their most recent message together.
            if (!conversationsMap.has(otherUserId)) {
                conversationsMap.set(otherUserId, {
                    otherUser: {
                        _id: otherUser._id,
                        name: otherUser.name,
                        role: otherUser.role
                    },
                    latestMessage: {
                        content: msg.content,
                        createdAt: msg.createdAt,
                        isMine: isSender
                    }
                });
            }
        });

        // Convert Map values to array
        const conversations = Array.from(conversationsMap.values());
        res.json(conversations);

    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ message: 'Server Error fetching conversations' });
    }
});

// @route   GET /api/messages/:userId
// @desc    Get chat history between logged in user and target userId
// @access  Private
router.get('/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.id;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: userId },
                { sender: userId, receiver: currentUserId }
            ]
        }).sort({ createdAt: 1 }); // Chronological order

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Server Error fetching messages' });
    }
});

module.exports = router;
