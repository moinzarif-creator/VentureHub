import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Explore = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('All'); // 'All', 'Investor', 'Entrepreneur'

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5001/api/explore/matches', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setUsers(res.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch the directory. Ensure you have saved your profile first to generate an AI embedding!');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const filteredUsers = filter === 'All' ? users : users.filter(u => u.role === filter);

    if (loading) return (
        <div className="flex justify-center items-center py-32 bg-gray-50 min-h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
        </div>
    );

    if (error) return (
        <div className="text-center py-20 bg-gray-50 min-h-screen">
            <p className="text-xl text-red-500 font-bold bg-white p-6 inline-block rounded-xl shadow">{error}</p>
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">AI Matchmaking Engine</h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">Discover highly compatible Investors and Entrepreneurs securely sorted by our Vector Matching algorithm.</p>
                </div>

                {/* Filters */}
                <div className="flex justify-center mb-10 gap-2 sm:gap-4">
                    {['All', 'Investor', 'Entrepreneur'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all duration-200 border
                                ${filter === f 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md transform -translate-y-0.5' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                            `}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                            No users found in this category.
                        </div>
                    ) : (
                        filteredUsers.map(user => (
                            <Link 
                                to={`/profile/${user._id}`} 
                                key={user._id} 
                                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col items-center p-6 transform hover:-translate-y-1 relative"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                {/* Synergy Score Badge */}
                                {user.synergyScore !== undefined && (
                                    <div className={`absolute top-4 right-4 px-2 py-1 rounded-md text-xs font-black shadow-sm flex items-center gap-1 z-10
                                        ${user.synergyScore > 80 ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm animate-pulse-subtle' : ''}
                                        ${user.synergyScore <= 80 && user.synergyScore > 50 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : ''}
                                        ${user.synergyScore <= 50 ? 'bg-gray-100 text-gray-400 border border-gray-200' : ''}
                                    `}>
                                        {user.synergyScore > 80 ? '🔥 High Match' : user.synergyScore > 50 ? 'Solid Match' : 'Low Synergy'} ({user.synergyScore}%)
                                    </div>
                                )}

                                <div className="w-24 h-24 rounded-full border-4 border-gray-50 bg-gray-100 mb-4 overflow-hidden shadow-inner flex-shrink-0 flex items-center justify-center mt-4">
                                    {(user.avatarUrl || user.logoUrl) ? (
                                        <img src={user.avatarUrl || user.logoUrl} alt={user.name} className={`w-full h-full ${user.role === 'Entrepreneur' ? 'object-contain p-2' : 'object-cover'}`} />
                                    ) : (
                                        <span className="text-3xl font-black text-gray-300">{user.name.charAt(0)}</span>
                                    )}
                                </div>
                                
                                <h3 className="text-lg font-bold text-gray-900 text-center line-clamp-1">{user.name}</h3>
                                
                                <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase
                                    ${user.role === 'Investor' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}
                                `}>
                                    {user.role}
                                </span>

                                <div className="mt-4 flex-1 w-full text-center">
                                    {user.role === 'Investor' && user.tagline && (
                                        <p className="text-sm text-gray-500 line-clamp-2 italic">"{user.tagline}"</p>
                                    )}
                                    {user.role === 'Entrepreneur' && user.companyName && (
                                        <p className="text-sm font-bold text-gray-700 bg-gray-50 py-1.5 rounded-lg border border-gray-100">🏢 {user.companyName}</p>
                                    )}
                                </div>

                                <div className="mt-6 text-sm font-bold text-blue-600 group-hover:text-blue-800 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                                    View Profile <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Explore;
