const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Public', 'Entrepreneur', 'Investor', 'Admin'],
        default: 'Public'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String
    },
    verificationTokenExpires: {
        type: Date
    },
    hasPaidKycFee: {
        type: Boolean,
        default: false
    },
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'Verified', 'rejected'],
        default: 'unverified'
    },
    kycVideoUrl: {
        type: String
    },
    closedDealsCount: {
        type: Number,
        default: 0
    },
    investmentPortfolio: [{
        pitchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Pitch'
        },
        amount: Number,
        equity: Number,
        date: {
            type: Date,
            default: Date.now
        }
    }],
    sectorsInvestedIn: [{
        type: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
