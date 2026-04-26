const Pitch = require('../models/Pitch');
const Bid = require('../models/Bid');
const Comment = require('../models/Comment');
const User = require('../models/User'); // ADDED User
const { createNotification } = require('./socketManager');

/**
 * Notifies all users who are tracking a pitch (have liked, bidded, or commented on it)
 * 
 * @param {String} pitchId - The ID of the pitch
 * @param {String} actorId - The ID of the user performing the action (so they don't get notified)
 * @param {String} actorName - The name of the user performing the action
 * @param {String} actionType - The type of action (e.g. 'bid', 'comment', 'like')
 * @param {String} actionStr - The verb phrase (e.g. 'just bid on', 'just liked')
 */
const notifyFollowers = async (pitchId, actorId, actorName, actionType, actionStr) => {
    try {
        const pitch = await Pitch.findById(pitchId);
        if (!pitch) return;

        const pitchTitle = pitch.title;
        const entrepreneurId = pitch.entrepreneurId.toString();
        const actorIdStr = actorId.toString();

        const followers = new Set();

        // 1. Add users who liked the pitch
        if (pitch.likes && pitch.likes.length > 0) {
            pitch.likes.forEach(likeId => followers.add(likeId.toString()));
        }

        // 2. Add users who bid on the pitch
        const bids = await Bid.find({ pitchId });
        bids.forEach(bid => followers.add(bid.investorId.toString()));

        // 3. Add users who commented on the pitch
        const comments = await Comment.find({ pitchId });
        comments.forEach(comment => followers.add(comment.author.toString()));

        // Ensure we don't notify the actor or the pitch owner (since owner gets direct notification)
        followers.delete(actorIdStr);
        followers.delete(entrepreneurId);

        // Dispatch notifications
        const message = `${actorName} ${actionStr} a pitch you follow: ${pitchTitle}`;

        for (const followerId of followers) {
            createNotification(
                actorId, // sender
                followerId, // receiver
                actionType, // e.g. 'bid', 'like', 'comment'
                pitchId, // referenceId
                message
            );
        }

    } catch (err) {
        console.error("Error in notifyFollowers:", err);
    }
};

/**
 * Strict FOMO Logic: Notify other investors when an investor comments on a pitch they track
 */
const notifyInvestorFOMO = async (pitchId, actorId, actorName, actorRole, commentText) => {
    try {
        // Only trigger if the actor is an investor
        if (actorRole !== 'Investor') return;

        const pitch = await Pitch.findById(pitchId);
        if (!pitch) return;

        const investors = new Set();

        // 1. Find investors who bid on this pitch
        const bids = await Bid.find({ pitchId }).populate('investorId');
        bids.forEach(bid => {
            if (bid.investorId && bid.investorId.role === 'Investor') {
                investors.add(bid.investorId._id.toString());
            }
        });

        // 2. Find investors who commented on this pitch
        const comments = await Comment.find({ pitchId }).populate('author');
        comments.forEach(comment => {
            if (comment.author && comment.author.role === 'Investor') {
                investors.add(comment.author._id.toString());
            }
        });

        // Remove the actor
        investors.delete(actorId.toString());

        const message = `FOMO Alert: ${actorName} just commented on a pitch you track: "${commentText.substring(0, 30)}..."`;

        for (const investorId of investors) {
            createNotification(
                actorId,
                investorId,
                'comment',
                pitchId,
                message
            );
        }

    } catch (err) {
        console.error("Error in notifyInvestorFOMO:", err);
    }
};

module.exports = {
    notifyFollowers,
    notifyInvestorFOMO
};
