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
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected', 'Countered'],
        default: 'Pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Bid', bidSchema);
