const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createNotification } = require('./utils/socketManager');
const User = require('./models/User');

dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const user1 = new mongoose.Types.ObjectId();
    const user2 = new mongoose.Types.ObjectId();

    console.log("Testing createNotification with new ObjectIds");
    const notif = await createNotification(user1, user2, 'message', user1, 'Test message');
    console.log("Created notification:", notif);

    process.exit(0);
}

run().catch(console.error);
