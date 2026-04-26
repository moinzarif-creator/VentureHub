const { io } = require('socket.io-client');
const mongoose = require('mongoose');

// Generate a random object id to test
const targetUserId = new mongoose.Types.ObjectId().toString();

const socket = io('http://localhost:5001');

socket.on('connect', () => {
    console.log("Connected to server, ID:", socket.id);
    console.log("Joining room:", 'user_' + targetUserId);
    socket.emit('join_user_room', targetUserId);
    
    // Now trigger a notification on the server side via test script
    setTimeout(() => {
        const { exec } = require('child_process');
        exec(`node test_notification2.js ${targetUserId}`, (err, stdout) => {
            console.log("Triggered notification on server:", stdout);
        });
    }, 1000);
});

socket.on('new_notification', (data) => {
    console.log("RECEIVED NOTIFICATION:", data);
    process.exit(0);
});

// timeout
setTimeout(() => {
    console.log("Timeout waiting for notification");
    process.exit(1);
}, 5000);
