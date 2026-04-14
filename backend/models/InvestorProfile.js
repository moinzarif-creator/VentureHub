const mongoose = require('mongoose');

const investorProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    investmentThesis: {
        type: String,
        default: ''
    },
    preferredIndustries: {
        type: [String],
        default: []
    },
    typicalCheckSize: {
        type: Number,
        default: 0
    },
    avatarUrl: {
        type: String,
        default: ''
    },
    embedding: {
        type: [Number],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('InvestorProfile', investorProfileSchema);
