const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); // Required for Socket.io
const { initSocket } = require('./utils/socketManager');
const Message = require('./models/Message'); // For saving messages

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io via manager
const io = initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const pitchRoutes = require('./routes/pitchRoutes');
const bidRoutes = require('./routes/bidRoutes');
const commentRoutes = require('./routes/commentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

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

// Notification Routes
app.use('/api/notifications', notificationRoutes);

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

// We handle the socket event for direct messages here since we need the 'io' instance
// Wait, actually, the socketManager now handles all connection logic. 
// We should move the 'send_message' event to socketManager OR we can listen to it here.
// Let's just modify the `socketManager.js` or keep it simple: `initSocket` handles all events.
// Since `server.js` was doing `io.on('connection')`, we need to add the `send_message` logic 
// back to `socketManager.js`. So I will remove `io.on('connection')` from `server.js` entirely.

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
