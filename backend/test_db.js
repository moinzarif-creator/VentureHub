const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Notification = require('./models/Notification');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log("Connected to MongoDB");
    const notifications = await Notification.find({});
    console.log("Total notifications:", notifications.length);
    if(notifications.length > 0) {
        console.log("Sample notification:", notifications[notifications.length-1]);
    }
    process.exit(0);
}).catch(console.error);
