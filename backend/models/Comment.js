const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    author: {
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

module.exports = mongoose.model('Comment', commentSchema);
