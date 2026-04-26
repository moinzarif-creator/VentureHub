const express = require('express');
const router = express.Router();
const Bid = require('../models/Bid');
const Pitch = require('../models/Pitch');
const User = require('../models/User'); // ADDED User
const authMiddleware = require('../middleware/authMiddleware');
const { createNotification } = require('../utils/socketManager');
const { checkFomoEffect, checkMarketSignals, checkSimilarPitchActivity } = require('../utils/synergyNotifications');
const { notifyFollowers } = require('../utils/trackingNotifications');

// @route   POST /api/bids
// @desc    Place a new bid on a pitch
// @access  Private (Investors usually, but leaving open to authenticated users for now)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { pitchId, bidAmount, equityRequested } = req.body;
        const investorId = req.user.id; // Extracted from JWT token via authMiddleware

        // Basic validation
        if (!pitchId || !bidAmount || !equityRequested) {
            return res.status(400).json({ message: "Please provide all required bid fields" });
        }

        // Create new bid instance
        const newBid = new Bid({
            pitchId,
            investorId,
            offerAmount: bidAmount,
            offerEquity: equityRequested
        });

        // Save to database
        const savedBid = await newBid.save();

        // Standard notification (Layer 1)
        const pitch = await Pitch.findById(pitchId);
        const actor = await User.findById(investorId);
        const actorName = actor ? actor.name : 'An investor';

        if (pitch) {
            createNotification(
                investorId, // sender
                pitch.entrepreneurId, // receiver
                'bid',
                savedBid._id,
                `${actorName} bid on your pitch: ${pitch.title}`
            );

            // Notify followers
            setImmediate(() => {
                notifyFollowers(pitch._id, investorId, actorName, 'bid', `just placed a $${bidAmount} bid on`);
            });
        }

        // Synergy notifications (Layer 2) - run asynchronously in the background
        setImmediate(() => {
            checkFomoEffect(savedBid._id);
            checkMarketSignals(savedBid._id);
            checkSimilarPitchActivity(savedBid._id);
        });

        res.status(201).json(savedBid);

    } catch (error) {
        console.error("Error creating bid:", error);
        res.status(500).json({ message: "Server error creating bid" });
    }
});

// @route   GET /api/bids/pitch/:pitchId
// @desc    Get all bids for a specific pitch
// @access  Private (Typically the Entrepreneur who owns the pitch)
router.get('/pitch/:pitchId', authMiddleware, async (req, res) => {
    try {
        const bids = await Bid.find({ pitchId: req.params.pitchId })
            .populate('investorId', 'name')
            .sort({ createdAt: -1 });

        res.json(bids);
    } catch (error) {
        console.error("Error fetching bids for pitch:", error);
        res.status(500).json({ message: "Server error fetching bids" });
    }
});

// @route   GET /api/bids/check/:investorId
// @desc    Check if an investor has an active bid on ANY of current user's pitches
// @access  Private
router.get('/check/:investorId', authMiddleware, async (req, res) => {
    try {
        // Find all pitches by the current entrepreneur
        const myPitches = await Pitch.find({ entrepreneurId: req.user.id }).select('_id');
        const pitchIds = myPitches.map(p => p._id);

        // Find all bids by this investor on any of these pitches
        const bids = await Bid.find({
            investorId: req.params.investorId,
            pitchId: { $in: pitchIds }
        }).populate('pitchId', 'title').sort({ createdAt: -1 });

        res.json(bids);
    } catch (error) {
        console.error("Error checking bid status:", error);
        res.status(500).json({ message: "Server error checking bid status" });
    }
});

module.exports = router;
