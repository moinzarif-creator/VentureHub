const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['like', 'comment', 'bid', 'message', 'synergy_pitch', 'synergy_fomo', 'synergy_market', 'direct_pitch', 'final_bid', 'deal_accepted', 'deal_rejected'],
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId // Can be PitchId, BidId, etc.
    },
    message: {
        type: String,
        required: true
    },
    link: {
        type: String // Optional deep link for routing
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
