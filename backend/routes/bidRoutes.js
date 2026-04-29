const express = require('express');
const mongoose = require('mongoose');
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

// @route   GET /api/bids/my-received
// @desc    Get all bids received on any of the current entrepreneur's pitches
//          (used by the Explore page to suppress "Send Pitch" for existing bidders)
// @access  Private
router.get('/my-received', authMiddleware, async (req, res) => {
    try {
        // Find all pitches owned by this entrepreneur
        const myPitches = await Pitch.find({ entrepreneurId: req.user.id }).select('_id');
        const pitchIds = myPitches.map(p => p._id);

        // Return all bids on those pitches, with investorId populated for ID lookup
        const bids = await Bid.find({ pitchId: { $in: pitchIds } })
            .populate('investorId', '_id')
            .select('investorId');

        res.json(bids);
    } catch (error) {
        console.error("Error fetching received bids:", error);
        res.status(500).json({ message: "Server error fetching received bids" });
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

// @route   PUT /api/bids/:id/final
// @desc    Submit a Final Bid (Investor updates bid to final)
// @access  Private
router.put('/:id/final', authMiddleware, async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id);
        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }
        
        if (bid.investorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this bid' });
        }

        bid.isFinalBid = true;
        await bid.save();

        res.json({ message: 'Bid marked as final', bid });
    } catch (error) {
        console.error("Error updating final bid:", error);
        res.status(500).json({ message: "Server error updating final bid" });
    }
});

// @route   POST /api/bids/:id/accept
// @desc    Accept a bid and finalize the deal
// @access  Private (Entrepreneur)
router.post('/:id/accept', authMiddleware, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const bid = await Bid.findById(req.params.id).session(session);
        if (!bid) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Bid not found' });
        }

        const pitch = await Pitch.findById(bid.pitchId).session(session);
        if (!pitch) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Pitch not found' });
        }

        if (pitch.entrepreneurId.toString() !== req.user.id) {
            await session.abortTransaction();
            session.endSession();
            return res.status(403).json({ message: 'Not authorized to accept bids for this pitch' });
        }

        // 1. Change the accepted Bid's dealStatus to 'Accepted'
        bid.dealStatus = 'Accepted';
        await bid.save({ session });

        // 2. Change all other pending Bids on this specific Pitch to dealStatus: 'Rejected'
        // Using dealStatus: { $ne: 'Accepted' } or simply missing dealStatus to be safe for legacy data
        // The instructions say "Change all other pending Bids on this specific Pitch to dealStatus: 'Rejected'."
        await Bid.updateMany(
            { pitchId: pitch._id, _id: { $ne: bid._id }, dealStatus: { $in: ['Pending', null] } },
            { $set: { dealStatus: 'Rejected' } },
            { session }
        );

        // 3. Change the Pitch's fundingStatus to 'Funded'
        pitch.fundingStatus = 'Funded';
        await pitch.save({ session });

        // 4. Increment the winning Investor's closedDealsCount by +1
        // 5. Push the deal details to the winning Investor's investmentPortfolio array
        const investor = await User.findById(bid.investorId).session(session);
        if (investor) {
            investor.closedDealsCount = (investor.closedDealsCount || 0) + 1;
            
            // To ensure safe array access
            if (!investor.investmentPortfolio) investor.investmentPortfolio = [];
            
            investor.investmentPortfolio.push({
                pitchId: pitch._id,
                amount: bid.offerAmount,
                equity: bid.offerEquity,
                date: new Date()
            });
            await investor.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Deal accepted successfully', bid });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error accepting deal:", error);
        res.status(500).json({ message: "Server error accepting deal" });
    }
});

// @route   GET /api/bids/my-offers
// @desc    Get all active bids placed by the current investor (latest per pitch)
// @access  Private (Investor)
router.get('/my-offers', authMiddleware, async (req, res) => {
    try {
        const bids = await Bid.find({ investorId: req.user.id })
            .populate('pitchId', 'title category financials.askAmount financials.equityOffered entrepreneurId')
            .sort({ createdAt: -1 });

        // Filter to keep only the latest bid per pitch
        const latestBidsMap = new Map();
        bids.forEach(bid => {
            const pitchIdStr = bid.pitchId?._id?.toString() || bid.pitchId?.toString();
            if (pitchIdStr && !latestBidsMap.has(pitchIdStr)) {
                latestBidsMap.set(pitchIdStr, bid);
            }
        });

        res.json(Array.from(latestBidsMap.values()));
    } catch (error) {
        console.error("Error fetching my offers:", error);
        res.status(500).json({ message: "Server error fetching my offers" });
    }
});

// @route   GET /api/bids/entrepreneur/hub
// @desc    Get all bids received on the entrepreneur's pitches (with full details and latest logic)
// @access  Private (Entrepreneur)
router.get('/entrepreneur/hub', authMiddleware, async (req, res) => {
    try {
        const myPitches = await Pitch.find({ entrepreneurId: req.user.id }).select('_id title category');
        const pitchIds = myPitches.map(p => p._id);

        const bids = await Bid.find({ pitchId: { $in: pitchIds } })
            .populate('investorId', 'name role avatarUrl')
            .populate('pitchId', 'title category')
            .sort({ createdAt: -1 });

        res.json(bids);
    } catch (error) {
        console.error("Error fetching entrepreneur hub bids:", error);
        res.status(500).json({ message: "Server error fetching hub bids" });
    }
});

// @route   PUT /api/bids/:id/reject
// @desc    Reject a bid
// @access  Private (Entrepreneur)
router.put('/:id/reject', authMiddleware, async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id).populate('pitchId');
        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }
        
        if (bid.pitchId.entrepreneurId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to reject this bid' });
        }

        bid.dealStatus = 'Rejected';
        await bid.save();

        res.json({ message: 'Bid rejected', bid });
    } catch (error) {
        console.error("Error rejecting bid:", error);
        res.status(500).json({ message: "Server error rejecting bid" });
    }
});

// @route   GET /api/bids/:id
// @desc    Get a specific bid by ID
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const bid = await Bid.findById(req.params.id)
            .populate('investorId', 'name role email')
            .populate({
                path: 'pitchId',
                populate: { path: 'entrepreneurId', select: 'name email' }
            });

        if (!bid) {
            return res.status(404).json({ message: 'Bid not found' });
        }

        // Basic authorization: must be the investor who made it or the entrepreneur who received it
        const isInvestor = bid.investorId._id.toString() === req.user.id;
        const isEntrepreneur = bid.pitchId.entrepreneurId._id.toString() === req.user.id;

        if (!isInvestor && !isEntrepreneur) {
            return res.status(403).json({ message: 'Not authorized to view this bid' });
        }

        res.json(bid);
    } catch (error) {
        console.error("Error fetching bid:", error);
        res.status(500).json({ message: "Server error fetching bid" });
    }
});

module.exports = router;
