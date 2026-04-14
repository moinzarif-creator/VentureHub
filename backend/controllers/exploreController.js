const User = require('../models/User');
const InvestorProfile = require('../models/InvestorProfile');
const EntrepreneurProfile = require('../models/EntrepreneurProfile');
const mongoose = require('mongoose');

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