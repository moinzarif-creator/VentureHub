const mongoose = require('mongoose');

const pitchSchema = new mongoose.Schema({
    entrepreneurId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    content: {
        problem: { type: String, required: true },
        solution: { type: String, required: true },
        mediaUrls: [{ type: String }] // Array of Cloudinary URLs
    },
    financials: {
        askAmount: { type: Number, required: true },
        equityOffered: { type: Number, required: true },
        isPrivate: { type: Boolean, default: false }
    },
    metrics: {
        type: mongoose.Schema.Types.Mixed, // Can store flexible metrics object or string
        default: {}
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    tags: [{
        type: String
    }],
    embedding: {
        type: [Number]
    },
    fundingStatus: {
        type: String,
        enum: ['Active', 'Funded'],
        default: 'Active'
    }
}, { timestamps: true });

module.exports = mongoose.model('Pitch', pitchSchema);
