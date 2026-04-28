const mongoose = require('mongoose');

const directPitchLogSchema = new mongoose.Schema({
    entrepreneurId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    investorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pitchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pitch',
        required: true
    }
}, { timestamps: true });

// Index for fast lookup of cooldowns
directPitchLogSchema.index({ entrepreneurId: 1, investorId: 1, pitchId: 1 });

module.exports = mongoose.model('DirectPitchLog', directPitchLogSchema);
