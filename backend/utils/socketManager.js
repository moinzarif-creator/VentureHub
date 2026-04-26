const { Server } = require('socket.io');
const Notification = require('../models/Notification');
const Message = require('../models/Message'); // For saving messages

let io;

module.exports = {
    initSocket: (server) => {
        io = new Server(server, {
            cors: {
                origin: "http://localhost:5173", // Allow react frontend
                methods: ["GET", "POST"]
            }
        });

        io.on('connection', (socket) => {
            console.log(`User Connected: ${socket.id}`);

            // Room logic for direct messages
            socket.on('join_room', (data) => {
                socket.join(data.roomId);
                console.log(`User with ID: ${socket.id} joined room: ${data.roomId}`);
            });

            // Room logic for personal notifications
            socket.on('join_user_room', (userId) => {
                const userRoom = `user_${userId}`;
                socket.join(userRoom);
                console.log(`User ID: ${userId} joined personal room: ${userRoom}`);
            });

            // Handle incoming messages
            socket.on('send_message', async (data) => {
                try {
                    // data: { roomId, sender, receiver, content }
                    const newMessage = new Message({
                        sender: data.sender,
                        receiver: data.receiver,
                        content: data.content
                    });
                    await newMessage.save();

                    const User = require('../models/User');
                    const sender = await User.findById(data.sender).select('name');
                    const senderName = sender ? sender.name : 'Someone';

                    // Emit to everyone in the room
                    io.to(data.roomId).emit('receive_message', newMessage);

                    // Also create a notification for the receiver
                    module.exports.createNotification(
                        data.sender,
                        data.receiver,
                        'message',
                        newMessage._id,
                        `New message from ${senderName}: "${data.content.substring(0, 30)}${data.content.length > 30 ? '...' : ''}"`
                    );

                } catch (err) {
                    console.error("Error saving socket message to DB:", err);
                }
            });

            socket.on('disconnect', () => {
                console.log('User Disconnected', socket.id);
            });
        });

        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error('Socket.io is not initialized!');
        }
        return io;
    },
    createNotification: async (senderId, receiverId, type, referenceId, message) => {
        try {
            // Prevent self-notifications
            if (senderId && senderId.toString() === receiverId.toString()) return null;

            const newNotification = new Notification({
                sender: senderId,
                receiver: receiverId,
                type,
                referenceId,
                message
            });

            const savedNotification = await newNotification.save();

            // Emit to the receiver's specific room
            if (io) {
                io.to(`user_${receiverId}`).emit('new_notification', savedNotification);
            }

            return savedNotification;
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }
};
