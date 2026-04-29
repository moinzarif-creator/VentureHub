const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
    pitchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pitch',
        required: true
    },
    investorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    offerAmount: {
        type: Number,
        required: true
    },
    offerEquity: {
        type: Number,
        required: true
    },
    termsAndConditions: {
        type: String
    },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected', 'Countered'],
        default: 'Pending'
    },
    isFinalBid: {
        type: Boolean,
        default: false
    },
    dealStatus: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected'],
        default: 'Pending'
    },
    lastModifiedBy: {
        type: String,
        enum: ['Investor', 'Entrepreneur'],
        default: 'Investor'
    },
    negotiationHistory: [
        {
            offerAmount: Number,
            offerEquity: Number,
            modifiedBy: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    expiryDate: {
        type: Date
    }
}, { timestamps: true });

module.exports = mongoose.model('Bid', bidSchema);
