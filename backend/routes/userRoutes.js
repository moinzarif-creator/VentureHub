const express = require('express');
const router = express.Router();
const User = require('../models/User');
const InvestorProfile = require('../models/InvestorProfile');
const EntrepreneurProfile = require('../models/EntrepreneurProfile');

// @route   GET /api/users
// @desc    Get all active users for the directory
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Find users, filtering out Admins and those who aren't verified
        const users = await User.find({
            role: { $ne: 'Admin' },
            isVerified: true
        }).select('name role createdAt');

        // To make the UI nice, we should fetch their basic profile image
        const investorIds = users.filter(u => u.role === 'Investor').map(u => u._id);
        const entrepreneurIds = users.filter(u => u.role === 'Entrepreneur').map(u => u._id);

        const investorProfiles = await InvestorProfile.find({ user: { $in: investorIds } }).select('user avatarUrl investmentThesis');
        const entrepreneurProfiles = await EntrepreneurProfile.find({ user: { $in: entrepreneurIds } }).select('user logoUrl companyName');

        // Map over users and append image/additional context
        const populatedUsers = users.map(u => {
            let userData = { ...u.toObject() };
            if (u.role === 'Investor') {
                const profile = investorProfiles.find(p => p.user.toString() === u._id.toString());
                if (profile) {
                    userData.avatarUrl = profile.avatarUrl;
                    userData.tagline = profile.investmentThesis;
                }
            } else if (u.role === 'Entrepreneur') {
                const profile = entrepreneurProfiles.find(p => p.user.toString() === u._id.toString());
                if (profile) {
                    userData.logoUrl = profile.logoUrl;
                    userData.companyName = profile.companyName;
                }
            }
            return userData;
        });

        res.json(populatedUsers);
    } catch (err) {
        console.error("Explore Directory Error:", err);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/users/:id
// @desc    Get a single user's public info
// @access  Public (or Private)
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('name role');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error("Fetch User Error:", err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
