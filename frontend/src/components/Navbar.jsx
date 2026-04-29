import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

// SVG Icon for Bell
const BellIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-200 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [userRole, setUserRole] = useState(null);
    const [userId, setUserId] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUserAndNotifications = async () => {
            if (token) {
                try {
                    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setUserRole(res.data.role);
                    setUserId(res.data._id);

                    // Fetch notifications
                    const notifRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setNotifications(notifRes.data);
                    setUnreadCount(notifRes.data.filter(n => !n.isRead).length);
                } catch (err) {
                    console.error('Error fetching user data or notifications', err);
                }
            }
        };
        fetchUserAndNotifications();
    }, [token]);

    useEffect(() => {
        let socket;
        if (token && userId) {
            socket = io(import.meta.env.VITE_API_URL);

            socket.on('connect', () => {
                socket.emit('join_user_room', userId);
            });

            socket.on('new_notification', (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);
            });
        }

        return () => {
            if (socket) socket.disconnect();
        };
    }, [token, userId]);

    const handleNotificationClick = async (notification) => {
        if (!notification.isRead) {
            try {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/${notification._id}/read`, {}, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (err) {
                console.error('Error marking notification as read', err);
            }
        }
        setShowNotifications(false);
        
        const senderId = typeof notification.sender === 'object' ? notification.sender._id : notification.sender;

        if (notification.type === 'comment' || notification.type === 'direct_pitch') {
            navigate(`/dashboard/pitch/${notification.referenceId}`);
        } else if (['like', 'bid', 'synergy_pitch', 'synergy_fomo', 'synergy_market'].includes(notification.type)) {
            navigate(`/profile/${senderId}`);
        } else if (notification.type === 'message') {
            navigate(`/chat/${senderId}`);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/read-all`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read', err);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUserRole(null);
        navigate('/login');
    };

    return (
        <nav className="flex justify-between items-center p-4 bg-gray-900 text-white shadow-md mb-6">
            <div className="flex items-center">
                <Link to="/" className="font-bold text-2xl tracking-tight text-white hover:text-gray-300 transition-colors">VentureHive</Link>
            </div>
            <div className="flex items-center gap-6">
                <Link to="/" className="text-gray-200 hover:text-white font-medium transition-colors">Home</Link>
                <Link to="/explore" className="text-gray-200 hover:text-white font-medium transition-colors">Explore</Link>
                {token ? (
                    <>
                        {userRole === 'Admin' || userRole === 'admin' ? (
                            <Link to="/admin" className="text-amber-400 hover:text-amber-300 font-bold transition-colors">Admin Dashboard</Link>
                        ) : null}
                        <Link to="/dashboard" className="text-gray-200 hover:text-white font-medium transition-colors">Dashboard</Link>
                        
                        {userRole === 'Investor' ? (
                            <Link to="/my-offers" className="text-gray-200 hover:text-white font-medium transition-colors">My Offers</Link>
                        ) : (
                            <>
                                <Link to="/create-pitch" className="text-gray-200 hover:text-white font-medium transition-colors">Create Pitch</Link>
                                {userRole === 'Entrepreneur' && (
                                    <Link to="/bids-hub" className="text-gray-200 hover:text-white font-medium transition-colors">Bids Hub</Link>
                                )}
                            </>
                        )}
                        
                        <Link to="/inbox" className="text-gray-200 hover:text-white font-medium transition-colors">Messages</Link>
                        <Link to="/profile" className="text-gray-200 hover:text-white font-medium transition-colors">My Profile</Link>
                        
                        {/* Notification Bell & Dropdown */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-1 focus:outline-none"
                            >
                                <BellIcon />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-20">
                                    <div className="flex justify-between items-center px-4 py-2 bg-gray-100 border-b">
                                        <span className="font-bold text-gray-800">Notifications</span>
                                        {unreadCount > 0 && (
                                            <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-800">
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">No notifications yet.</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div 
                                                    key={n._id} 
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50' : ''}`}
                                                >
                                                    <p className="text-sm text-gray-800">{n.message}</p>
                                                    <span className="text-xs text-gray-500 mt-1 block">
                                                        {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded transition-colors">Logout</button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="text-gray-200 hover:text-white font-medium transition-colors">Login</Link>
                        <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded transition-colors">Register</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
