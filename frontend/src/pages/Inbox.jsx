import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Inbox = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return navigate('/login');

                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/messages/conversations`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                setConversations(res.data);
            } catch (err) {
                console.error("Error fetching conversations:", err);
                setError(err.response?.data?.message || "Failed to load inbox");
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();
    }, [navigate]);

    if (loading) {
        return <div className="text-center mt-20 p-8 text-xl font-medium text-gray-500">Loading your inbox...</div>;
    }

    if (error) {
        return <div className="text-center mt-20 p-8 text-xl font-medium text-red-500">{error}</div>;
    }

    return (
        <div className="bg-gray-50 min-h-[calc(100vh-64px)] p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                    <h1 className="text-3xl font-bold text-gray-900">Your Messages</h1>
                </div>

                {conversations.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center text-gray-500 border border-gray-100">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                        </svg>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Inbox Empty</h2>
                        <p className="mb-6 max-w-md mx-auto">Your active 1-on-1 chats will appear here. Head over to the global pitch feed to start a new discussion!</p>
                        <button onClick={() => navigate('/dashboard')} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors font-medium">
                            Explore Pitches
                        </button>
                    </div>
                ) : (
                    <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                        {conversations.map((convo, idx) => (
                            <div 
                                key={convo.otherUser._id || idx}
                                onClick={() => navigate(`/chat/${convo.otherUser._id}`)}
                                className="p-5 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4 group"
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-lg border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    {convo.otherUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-lg font-semibold text-gray-900 truncate pr-2 group-hover:text-blue-700 transition-colors">
                                            {convo.otherUser.name}
                                        </h3>
                                        <span className="text-xs font-medium text-gray-400 whitespace-nowrap">
                                            {new Date(convo.latestMessage.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${convo.otherUser.role === 'investor' || convo.otherUser.role === 'Investor' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                            {convo.otherUser.role}
                                        </span>
                                        <p className="text-sm text-gray-500 truncate">
                                            {convo.latestMessage.isMine && <span className="text-gray-400 mr-1">You:</span>}
                                            {convo.latestMessage.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inbox;
