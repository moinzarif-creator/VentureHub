const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({ receiver: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50); // Get latest 50 notifications
            
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Server error fetching notifications' });
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, receiver: req.user.id },
            { isRead: true },
            { returnDocument: 'after' }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json(notification);
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ message: 'Server error updating notification' });
    }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { receiver: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
