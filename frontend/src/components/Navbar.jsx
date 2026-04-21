import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (token) {
                try {
                    const res = await axios.get('http://localhost:5001/api/auth/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setUserRole(res.data.role);
                } catch (err) {
                    console.error('Error fetching user for navbar role check', err);
                }
            }
        };
        fetchUserRole();
    }, [token]);

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
                        <Link to="/create-pitch" className="text-gray-200 hover:text-white font-medium transition-colors">Create Pitch</Link>
                        <Link to="/inbox" className="text-gray-200 hover:text-white font-medium transition-colors">Messages</Link>
                        <Link to="/profile" className="text-gray-200 hover:text-white font-medium transition-colors">My Profile</Link>
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
