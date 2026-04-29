import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import CreatePitch from './pages/CreatePitch';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import Inbox from './pages/Inbox';
import Navbar from './components/Navbar';
import VerifyEmail from './pages/VerifyEmail';
import Explore from './pages/Explore';
import PublicProfile from './pages/PublicProfile';
import PitchDetail from './pages/PitchDetail';
import MyOffers from './pages/MyOffers';
import BidsHub from './pages/BidsHub';
import BidView from './pages/BidView';

import { ToastProvider } from './context/ToastContext';

function App() {
    return (
        <ToastProvider>
            <Router>
                <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                    <Navbar />
                    <Routes>
                    <Route path="/" element={<h1>Welcome to VentureHive</h1>} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/create-pitch" element={<CreatePitch />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/dashboard/pitch/:id" element={<PitchDetail />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/explore" element={<Explore />} />
                    <Route path="/profile/:id" element={<PublicProfile />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/chat/:userId" element={<Chat />} />
                    <Route path="/inbox" element={<Inbox />} />
                    <Route path="/my-offers" element={<MyOffers />} />
                    <Route path="/bids-hub" element={<BidsHub />} />
                    <Route path="/bid/:id" element={<BidView />} />
                </Routes>
                </div>
            </Router>
        </ToastProvider>
    );
}

export default App;
