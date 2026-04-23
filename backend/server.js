const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); // Required for Socket.io
const { Server } = require('socket.io'); // Socket.io Server class
const Message = require('./models/Message'); // For saving messages

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // Allow react frontend
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const pitchRoutes = require('./routes/pitchRoutes');
const bidRoutes = require('./routes/bidRoutes');
const commentRoutes = require('./routes/commentRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Basic Route
app.get('/', (req, res) => {
  res.send('VentureHive API is running...');
});

// Admin Routes
app.use('/api/admin', adminRoutes);

// Auth Routes
app.use('/api/auth', authRoutes);

// Pitch Routes
app.use('/api/pitches', pitchRoutes);

// Bid Routes
app.use('/api/bids', bidRoutes);

// Comment Routes
app.use('/api/comments', commentRoutes);

const paymentRoutes = require('./routes/paymentRoutes');
// Payment Routes
app.use('/api/payment', paymentRoutes);

const messageRoutes = require('./routes/messageRoutes');
// Message Routes
app.use('/api/messages', messageRoutes);

const profileRoutes = require('./routes/profileRoutes');
// Profile Routes
app.use('/api/profiles', profileRoutes);

const userRoutes = require('./routes/userRoutes');
// User Routes -> Directory Explore
app.use('/api/users', userRoutes);

const exploreRoutes = require('./routes/exploreRoutes');
app.use('/api/explore', exploreRoutes);

// Global Error Handler to catch hidden crashes
app.use((err, req, res, next) => {
  console.error("🔥 FATAL ERROR:", err);
  res.status(500).json({ error: err.message || "Something broke!" });
});
// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in the environment variables.");
  process.exit(1);
}

// Socket.io Events
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Join a specific chat room
  socket.on('join_room', (data) => {
    socket.join(data.roomId);
    console.log(`User with ID: ${socket.id} joined room: ${data.roomId}`);
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

      // Emit to everyone in the room (including sender to confirm receipt if desired)
      io.to(data.roomId).emit('receive_message', newMessage);
    } catch (err) {
      console.error("Error saving socket message to DB:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
  });
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    // Listen on the HTTP Server! NOT just Express apps.
    server.listen(PORT, () => console.log(`HTTP/Socket Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
