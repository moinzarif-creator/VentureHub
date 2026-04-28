const User = require('../models/User');
const InvestorProfile = require('../models/InvestorProfile');
const EntrepreneurProfile = require('../models/EntrepreneurProfile');
const Pitch = require('../models/Pitch');
const DirectPitchLog = require('../models/DirectPitchLog');
const mongoose = require('mongoose');
const { createNotification } = require('../utils/socketManager');

// @route   GET /api/explore/matches
// @desc    Hybrid Matchmaking Engine (Vector + Dealbreakers)
// @access  Private
exports.getMatches = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser || currentUser.role === 'Admin') return res.status(403).json({ message: 'Invalid role for matching' });

        let currentProfile;
        let TargetProfileModel;
        let targetRole;
        let targetIndexName; // Dynamic index name to handle the MongoDB mismatch

        if (currentUser.role === 'Investor') {
            currentProfile = await InvestorProfile.findOne({ user: currentUser._id });
            TargetProfileModel = EntrepreneurProfile;
            targetRole = 'Entrepreneur';
            // When Investor searches, look at the Entrepreneur index:
            targetIndexName = 'vector_index_venture';
        } else if (currentUser.role === 'Entrepreneur') {
            currentProfile = await EntrepreneurProfile.findOne({ user: currentUser._id });
            TargetProfileModel = InvestorProfile;
            targetRole = 'Investor';
            // When Entrepreneur searches, look at the Investor index:
            targetIndexName = 'vector_index';
        }

        if (!currentProfile || !currentProfile.embedding || currentProfile.embedding.length === 0) {
            return res.status(400).json({ message: "Please update your profile to generate an AI embedding before using the matchmaking engine." });
        }

        // Soft Dealbreaker scoring logic
        let passesDealbreaker;
        if (targetRole === 'Investor') {
            passesDealbreaker = {
                $gte: ["$typicalCheckSize", (currentProfile.fundingGoal || 0) * 0.5]
            };
        } else {
            passesDealbreaker = {
                $lte: ["$fundingGoal", (currentProfile.typicalCheckSize || 0) * 5]
            };
        }

        const matchPipeline = [
            {
                $vectorSearch: {
                    index: targetIndexName, // Dynamically swaps based on who is searching!
                    path: "embedding",
                    queryVector: currentProfile.embedding,
                    numCandidates: 100,
                    limit: 50
                }
            },
            {
                $addFields: {
                    vectorScore: { $meta: "vectorSearchScore" },
                    meetsDealbreaker: { $cond: { if: passesDealbreaker, then: 1.0, else: 0.4 } }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userData"
                }
            },
            { $unwind: "$userData" },
            {
                $match: {
                    "userData.isVerified": true // Kept as requested!
                }
            },
            {
                $project: {
                    _id: "$userData._id",
                    name: "$userData.name",
                    role: "$userData.role",
                    // Use $ifNull so it safely grabs either the thesis or the description
                    tagline: { $ifNull: ["$investmentThesis", "$companyDescription"] },
                    companyName: "$companyName",
                    avatarUrl: "$avatarUrl",
                    logoUrl: "$logoUrl",
                    synergyScore: {
                        $min: [
                            {
                                $round: [{
                                    $multiply: [
                                        { $multiply: ["$vectorScore", 120] },
                                        "$meetsDealbreaker"
                                    ]
                                }, 0]
                            },
                            100
                        ]
                    }
                }
            },
            { $sort: { synergyScore: -1 } }
        ];

        const matches = await TargetProfileModel.aggregate(matchPipeline);
        res.json(matches);

    } catch (err) {
        console.error("Matchmaking error:", err);
        res.status(500).json({ message: "Server Error during Matchmaking Engine Execution" });
    }
};

// @route   GET /api/explore/search-investors
// @desc    Search Investors by name, category, and industries
// @access  Private (Entrepreneurs)
exports.searchInvestors = async (req, res) => {
    try {
        const { search, industry } = req.query;
        
        // 1. Build User query for Name search
        let userQuery = { role: 'Investor' };
        if (search && search.trim() !== '') {
            userQuery.name = { $regex: search.trim(), $options: 'i' };
        }

        // 2. Find matching users
        const users = await User.find(userQuery).select('_id');
        const userIds = users.map(u => u._id);

        // 3. Build Profile query for Industry search
        let profileQuery = { user: { $in: userIds } };
        if (industry && industry !== 'All Industries' && industry.trim() !== '') {
            // Fuzzy match within the array of preferredIndustries
            profileQuery.preferredIndustries = { $regex: industry.trim(), $options: 'i' };
        }

        // 4. Fetch profiles with populated user data
        const profiles = await InvestorProfile.find(profileQuery).populate('user', 'name avatarUrl role isVerified');

        const results = profiles.map(p => ({
            _id: p.user._id,
            name: p.user.name,
            role: p.user.role,
            tagline: p.investmentThesis,
            avatarUrl: p.avatarUrl,
            preferredIndustries: p.preferredIndustries,
            isVerified: p.user.isVerified
        }));

        res.json(results);
    } catch (err) {
        console.error("Search Investors error:", err);
        res.status(500).json({ message: "Server Error searching investors" });
    }
};

// @route   POST /api/explore/send-pitch
// @desc    Send a direct pitch to an investor with 7-day cooldown
// @access  Private (Entrepreneurs)
exports.sendDirectPitch = async (req, res) => {
    try {
        const { investorId, pitchId } = req.body;
        const entrepreneurId = req.user.id;

        console.log(`[DirectPitch] Attempting to send pitch ${pitchId} to investor ${investorId} from user ${entrepreneurId}`);

        if (!investorId || !pitchId) {
            return res.status(400).json({ message: "Missing investorId or pitchId in request payload" });
        }

        // Check if investor exists and is actually an investor
        const investor = await User.findById(investorId);
        if (!investor || investor.role !== 'Investor') {
            return res.status(404).json({ message: "Target investor not found or invalid role" });
        }

        // Check cooldown: same pitch to same investor within 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const existingLog = await DirectPitchLog.findOne({
            entrepreneurId,
            investorId,
            pitchId,
            createdAt: { $gte: sevenDaysAgo }
        });

        if (existingLog) {
            const daysLeft = Math.ceil((existingLog.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000));
            return res.status(400).json({ message: `You have already sent this pitch to ${investor.name} recently. Cooldown active for ${daysLeft} more days.` });
        }

        // Fetch pitch and entrepreneur info for notification
        const pitch = await Pitch.findById(pitchId);
        const entrepreneur = await User.findById(entrepreneurId);

        if (!pitch) return res.status(404).json({ message: "Pitch not found" });

        // Log the action
        const newLog = new DirectPitchLog({ entrepreneurId, investorId, pitchId });
        await newLog.save();

        // Trigger notification (This uses the 'direct_pitch' type we just added to the enum)
        const notification = await createNotification(
            entrepreneurId,
            investorId,
            'direct_pitch',
            pitchId,
            `${entrepreneur.name} has directly invited you to view their pitch: ${pitch.title}`
        );

        if (!notification) {
            console.warn("[DirectPitch] Notification could not be created, but log was saved.");
        }

        console.log(`[DirectPitch] Success: Pitch ${pitchId} sent to ${investorId}`);
        res.json({ message: "Pitch sent successfully!" });
    } catch (err) {
        console.error("Send Direct Pitch Fatal Error:", err);
        res.status(500).json({ 
            message: "Internal Server Error while sending pitch", 
            error: err.message 
        });
    }
};

// @route   GET /api/explore/cooldowns/:investorId
// @desc    Check cooldowns for all pitches for a specific investor
// @access  Private (Entrepreneurs)
exports.getPitchCooldowns = async (req, res) => {
    try {
        const { investorId } = req.params;
        const entrepreneurId = req.user.id;

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const logs = await DirectPitchLog.find({
            entrepreneurId,
            investorId,
            createdAt: { $gte: sevenDaysAgo }
        });

        const cooldowns = logs.map(log => ({
            pitchId: log.pitchId,
            availableAt: new Date(log.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
        }));

        res.json(cooldowns);
    } catch (err) {
        console.error("Get Cooldowns error:", err);
        res.status(500).json({ message: "Server Error fetching cooldowns" });
    }
};