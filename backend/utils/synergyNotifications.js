const Pitch = require('../models/Pitch');
const Bid = require('../models/Bid');
const User = require('../models/User');
const InvestorProfile = require('../models/InvestorProfile');
const EntrepreneurProfile = require('../models/EntrepreneurProfile');
const { createNotification } = require('./socketManager');

const checkDirectSynergy = async (pitchId) => {
    try {
        const pitch = await Pitch.findById(pitchId).populate('entrepreneurId', 'name');
        if (!pitch) return;

        const entrepreneurProfile = await EntrepreneurProfile.findOne({ user: pitch.entrepreneurId._id });
        if (!entrepreneurProfile || !entrepreneurProfile.embedding || entrepreneurProfile.embedding.length === 0) return;

        // Find top 5 matching investors
        const matchPipeline = [
            {
                $vectorSearch: {
                    index: 'vector_index', // Investor index
                    path: 'embedding',
                    queryVector: entrepreneurProfile.embedding,
                    numCandidates: 100,
                    limit: 5
                }
            },
            {
                $project: {
                    user: 1,
                    vectorScore: { $meta: "vectorSearchScore" }
                }
            }
        ];

        const topInvestors = await InvestorProfile.aggregate(matchPipeline);

        // Send notifications
        for (const investor of topInvestors) {
            // High synergy threshold (e.g. > 0.75)
            if (investor.vectorScore > 0.75) {
                createNotification(
                    pitch.entrepreneurId._id, // sender
                    investor.user, // receiver
                    'synergy_pitch',
                    pitch._id,
                    `Direct Match: ${pitch.entrepreneurId.name} just posted a new pitch you'll love: ${pitch.title}`
                );
            }
        }
    } catch (err) {
        console.error("Error in checkDirectSynergy:", err);
    }
};

const checkFomoEffect = async (bidId) => {
    try {
        const bid = await Bid.findById(bidId).populate('investorId', 'name');
        if (!bid) return;

        const pitch = await Pitch.findById(bid.pitchId);
        if (!pitch) return;

        const biddingInvestorProfile = await InvestorProfile.findOne({ user: bid.investorId._id });
        if (!biddingInvestorProfile || !biddingInvestorProfile.embedding || biddingInvestorProfile.embedding.length === 0) return;

        // Find similar investors to the one who just bid
        const matchPipeline = [
            {
                $vectorSearch: {
                    index: 'vector_index', // Investor index
                    path: 'embedding',
                    queryVector: biddingInvestorProfile.embedding,
                    numCandidates: 100,
                    limit: 10
                }
            },
            {
                $match: {
                    user: { $ne: bid.investorId._id } // Exclude the bidding investor
                }
            },
            {
                $project: {
                    user: 1,
                    vectorScore: { $meta: "vectorSearchScore" }
                }
            }
        ];

        const similarInvestors = await InvestorProfile.aggregate(matchPipeline);

        for (const investor of similarInvestors) {
            if (investor.vectorScore > 0.75) {
                createNotification(
                    bid.investorId._id, // sender
                    investor.user, // receiver
                    'synergy_fomo',
                    pitch._id,
                    `Market Activity: An investor with a similar thesis to you just bid on a startup!`
                );
            }
        }
    } catch (err) {
        console.error("Error in checkFomoEffect:", err);
    }
};

const checkMarketSignals = async (bidId) => {
    try {
        const bid = await Bid.findById(bidId).populate('investorId', 'name');
        if (!bid) return;

        const biddingInvestorProfile = await InvestorProfile.findOne({ user: bid.investorId._id });
        if (!biddingInvestorProfile || !biddingInvestorProfile.embedding || biddingInvestorProfile.embedding.length === 0) return;

        const pitch = await Pitch.findById(bid.pitchId);
        
        // Find Entrepreneurs similar to the bidding investor's embedding
        // (Wait, the logic is: "If an Entrepreneur and Investor have high synergy, and the Investor bids on a similar startup...")
        // Simplified Logic: Find Entrepreneurs with high vector similarity to the bidding Investor.
        const matchPipeline = [
            {
                $vectorSearch: {
                    index: 'vector_index_venture', // Entrepreneur index
                    path: 'embedding',
                    queryVector: biddingInvestorProfile.embedding,
                    numCandidates: 100,
                    limit: 5
                }
            },
            {
                $match: {
                    user: { $ne: pitch.entrepreneurId } // Exclude the one who just got the bid
                }
            },
            {
                $project: {
                    user: 1,
                    vectorScore: { $meta: "vectorSearchScore" }
                }
            }
        ];

        const matchedEntrepreneurs = await EntrepreneurProfile.aggregate(matchPipeline);

        for (const ent of matchedEntrepreneurs) {
            if (ent.vectorScore > 0.75) {
                createNotification(
                    bid.investorId._id, // sender
                    ent.user, // receiver
                    'synergy_market',
                    pitch._id,
                    `Market Signal: An investor highly aligned with your startup just bid on a similar pitch!`
                );
            }
        }
    } catch (err) {
        console.error("Error in checkMarketSignals:", err);
    }
};

/**
 * Competitive Intelligence: Notify entrepreneurs when a pitch in their same category gets a bid
 */
const checkSimilarPitchActivity = async (bidId) => {
    try {
        const bid = await Bid.findById(bidId);
        if (!bid) return;

        const originalPitch = await Pitch.findById(bid.pitchId);
        if (!originalPitch) return;

        // Find other pitches in the same category belonging to DIFFERENT entrepreneurs
        const similarPitches = await Pitch.find({
            category: originalPitch.category,
            _id: { $ne: originalPitch._id }, // Exclude the pitch that got the bid
            entrepreneurId: { $ne: originalPitch.entrepreneurId } // Exclude the same owner
        }).select('entrepreneurId title');

        for (const pitch of similarPitches) {
            createNotification(
                bid.investorId, // sender (the investor who bid)
                pitch.entrepreneurId, // receiver (owner of similar pitch)
                'synergy_market',
                originalPitch._id,
                `Market Activity: An investor just bid on a pitch in your category (${originalPitch.category})! Competitive interest is rising.`
            );
        }
    } catch (err) {
        console.error("Error in checkSimilarPitchActivity:", err);
    }
};

module.exports = {
    checkDirectSynergy,
    checkFomoEffect,
    checkMarketSignals,
    checkSimilarPitchActivity
};
