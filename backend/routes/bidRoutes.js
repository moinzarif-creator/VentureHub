const express = require('express');
const router = express.Router();
const Bid = require('../models/Bid');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST /api/bids
// @desc    Submit a bid (Term Sheet)
// @access  Private (Investors)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { pitchId, bidAmount, equityRequested, termsAndConditions } = req.body;
        const investorId = req.user.id; // Extracted from JWT token via authMiddleware

        // Basic validation
        if (!pitchId || !bidAmount || !equityRequested) {
            return res.status(400).json({ message: "Please provide all required bid fields" });
        }

        // Create new bid instance
        const newBid = new Bid({
            pitchId,
            investorId,
            offerAmount: Number(bidAmount),
            offerEquity: Number(equityRequested),
            termsAndConditions
        });

        // Save to database
        const savedBid = await newBid.save();
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

module.exports = router;
