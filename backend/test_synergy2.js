const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { checkDirectSynergy, checkFomoEffect, checkMarketSignals } = require('./utils/synergyNotifications');
const Pitch = require('./models/Pitch');
const Bid = require('./models/Bid');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected to MongoDB");
    
    // override createNotification just to log
    const sm = require('./utils/socketManager');
    sm.createNotification = (sender, receiver, type, ref, msg) => {
        console.log(`CREATE NOTIFICATION called: type=${type}, sender=${sender}, receiver=${receiver}`);
    };

    try {
        const pitch = await Pitch.findOne({});
        if (pitch) {
            console.log("Testing checkDirectSynergy for pitch", pitch._id);
            await checkDirectSynergy(pitch._id);
        } else {
            console.log("No pitch found");
        }

        const bid = await Bid.findOne({});
        if (bid) {
            console.log("Testing checkFomoEffect for bid", bid._id);
            await checkFomoEffect(bid._id);
            console.log("Testing checkMarketSignals for bid", bid._id);
            await checkMarketSignals(bid._id);
        } else {
            console.log("No bid found");
        }

    } catch (err) {
        console.error("Test script error:", err);
    }
    console.log("Done testing");
    process.exit(0);
}).catch(console.error);
