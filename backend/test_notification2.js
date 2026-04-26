const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createNotification } = require('./utils/socketManager');
dotenv.config();

const targetUserId = process.argv[2];

mongoose.connect(process.env.MONGO_URI).then(async () => {
    await createNotification(
        new mongoose.Types.ObjectId(), 
        targetUserId, 
        'message', 
        new mongoose.Types.ObjectId(), 
        'Test WebSocket message'
    );
    console.log("Done");
    process.exit(0);
});
