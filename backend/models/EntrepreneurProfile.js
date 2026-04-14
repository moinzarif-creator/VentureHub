const mongoose = require('mongoose');

const entrepreneurProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    companyName: {
        type: String,
        default: ''
    },
    startupStage: {
        type: String,
        enum: ['Idea', 'MVP', 'Seed', ''],
        default: ''
    },
    fundingGoal: {
        type: Number,
        default: 0
    },
    pitchDeckUrl: {
        type: String,
        default: ''
    },
    logoUrl: {
        type: String,
        default: ''
    },
    embedding: {
        type: [Number],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('EntrepreneurProfile', entrepreneurProfileSchema);
