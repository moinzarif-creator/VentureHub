const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const User = require('../models/User');

// @route   GET /api/admin/kyc-pending
// @desc    Get all users with pending KYC status
// @access  Private/Admin
router.get('/kyc-pending', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const pendingUsers = await User.find({ verificationStatus: 'pending' }).select('-password');
        res.json(pendingUsers);
    } catch (error) {
        console.error('Error fetching pending KYC:', error);
        res.status(500).json({ message: 'Server Error fetching pending KYC users' });
    }
});

// @route   PUT /api/admin/kyc-review/:userId
// @desc    Approve or reject a KYC video
// @access  Private/Admin
router.put('/kyc-review/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status provided' });
        }

        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.verificationStatus = status;

        if (status === 'rejected') {
            user.isVerified = false;
        } else if (status === 'approved') {
            // Explicitly ensure the user does NOT get verified without paying the fee.
            // This prevents old polluted testing data from bypassing the payment gateway.
            user.isVerified = false;
        }

        await user.save();

        res.json({ message: `User KYC ${status} successfully`, user: { id: user.id, name: user.name, verificationStatus: user.verificationStatus, isVerified: user.isVerified } });
    } catch (error) {
        console.error('Error reviewing KYC:', error);
        res.status(500).json({ message: 'Server Error processing KYC review' });
    }
});

module.exports = router;
