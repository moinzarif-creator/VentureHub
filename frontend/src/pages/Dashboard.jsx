import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
    const navigate = useNavigate();
    const [pitches, setPitches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [activeBidPitchId, setActiveBidPitchId] = useState(null);
    const [bidData, setBidData] = useState({ bidAmount: '', equityRequested: '' });
    const [bidLoading, setBidLoading] = useState(false);
    const [bidSuccess, setBidSuccess] = useState(null);

    const [activeCommentsPitchId, setActiveCommentsPitchId] = useState(null);
    const [activePitchComments, setActivePitchComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [minAsk, setMinAsk] = useState('');
    const [maxAsk, setMaxAsk] = useState('');
    const [selectedTag, setSelectedTag] = useState('');

    const fetchPitches = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (minAsk) params.minAsk = minAsk;
            if (maxAsk) params.maxAsk = maxAsk;
            if (selectedTag) params.tag = selectedTag;

            const res = await axios.get('http://localhost:5001/api/pitches', {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params
            });
            setPitches(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error fetching pitches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPitches();
    }, []);

    const handleBidChange = (e) => {
        setBidData({ ...bidData, [e.target.name]: e.target.value });
    };

    const toggleBidForm = (pitchId) => {
        if (activeBidPitchId === pitchId) {
            setActiveBidPitchId(null);
        } else {
            setActiveBidPitchId(pitchId);
            setBidData({ bidAmount: '', equityRequested: '' });
            setBidSuccess(null);
        }
    };

    const handleBidSubmit = async (e, pitchId) => {
        e.preventDefault();
        setBidLoading(true);
        setBidSuccess(null);

        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5001/api/bids',
                { pitchId, ...bidData },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            setBidSuccess(pitchId);
            setTimeout(() => {
                setActiveBidPitchId(null);
                setBidSuccess(null);
            }, 3000); // Close form after 3 seconds on success
        } catch (err) {
            alert(err.response?.data?.message || 'Error placing bid');
        } finally {
            setBidLoading(false);
        }
    };

    const handleLike = async (pitchId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5001/api/pitches/${pitchId}/like`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Update the local pitches state with the new likes array
            setPitches(pitches.map(pitch => {
                if (pitch._id === pitchId) {
                    return { ...pitch, likes: res.data };
                }
                return pitch;
            }));
        } catch (err) {
            alert(err.response?.data?.message || 'Error updating like status');
        }
    };

    const toggleComments = async (pitchId) => {
        if (activeCommentsPitchId === pitchId) {
            setActiveCommentsPitchId(null);
            return;
        }

        // Close bid form if open
        if (activeBidPitchId === pitchId) {
            setActiveBidPitchId(null);
        }

        setActiveCommentsPitchId(pitchId);
        setCommentsLoading(true);
        setActivePitchComments([]);
        setNewCommentText('');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:5001/api/comments/pitch/${pitchId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setActivePitchComments(res.data);
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleCommentSubmit = async (e, pitchId) => {
        e.preventDefault();
        if (!newCommentText.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:5001/api/comments`,
                { text: newCommentText, pitchId },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            // Instantly add the new comment to the UI array
            setActivePitchComments([...activePitchComments, res.data]);
            setNewCommentText('');
        } catch (err) {
            alert(err.response?.data?.message || 'Error posting comment');
        }
    };

    const renderMedia = (url) => {
        const isVideo = url.match(/\.(mp4|mov|avi|webm)$/i);
        if (isVideo) {
            return <video src={url} controls className="w-full h-48 object-cover object-center" />;
        }
        return <img src={url} alt="Pitch media" className="w-full h-48 object-cover object-center" />;
    };

    if (loading) return <div className="text-center mt-20 text-lg text-gray-600">Loading dashboard...</div>;
    if (error) return <div className="text-center mt-20 text-lg text-red-500">{error}</div>;

    return (
        <div className="bg-gray-50 min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">VentureHive Pitch Feed</h2>

                {/* Search and Filter Bar */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-8 z-10 relative">
                    <form onSubmit={(e) => { e.preventDefault(); fetchPitches(); }} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Search Keywords</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </span>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search problem, solution, or title..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-sm"
                                />
                            </div>
                        </div>

                        <div className="w-full md:w-40 flex-shrink-0">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Specific Tag</label>
                            <input
                                type="text"
                                value={selectedTag}
                                onChange={(e) => setSelectedTag(e.target.value)}
                                placeholder="E.g., AI, FinTech"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-sm"
                            />
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="w-1/2 md:w-32">
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Min Ask ($)</label>
                                <input
                                    type="number"
                                    value={minAsk}
                                    onChange={(e) => setMinAsk(e.target.value)}
                                    placeholder="Min"
                                    min="0"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-sm"
                                />
                            </div>
                            <div className="w-1/2 md:w-32">
                                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Max Ask ($)</label>
                                <input
                                    type="number"
                                    value={maxAsk}
                                    onChange={(e) => setMaxAsk(e.target.value)}
                                    placeholder="Max"
                                    min="0"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                type="submit"
                                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
                            >
                                Apply Filters
                            </button>
                            {(searchTerm || minAsk || maxAsk || selectedTag) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm(''); setMinAsk(''); setMaxAsk(''); setSelectedTag('');
                                        setTimeout(() => document.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })), 0);
                                    }}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm focus:outline-none"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {pitches.length === 0 ? (
                        <p className="text-gray-500 text-center col-span-full">No pitches available yet.</p>
                    ) : (
                        pitches.map((pitch) => (
                            <div key={pitch._id} className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300 border border-gray-100">

                                {pitch.content.mediaUrls && pitch.content.mediaUrls.length > 0 && (
                                    <div className="w-full relative">
                                        {renderMedia(pitch.content.mediaUrls[0])}
                                        {pitch.content.mediaUrls.length > 1 && (
                                            <span className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                                                +{pitch.content.mediaUrls.length - 1} Media
                                            </span>
                                        )}
                                    </div>
                                )}
                                {!pitch.content.mediaUrls || pitch.content.mediaUrls.length === 0 && (
                                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    </div>
                                )}

                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <h3 className="text-xl font-bold text-gray-900 line-clamp-1 flex-1">{pitch.title}</h3>
                                    </div>
                                    <p className="text-sm font-medium text-blue-600 mb-4 tracking-wide uppercase">
                                        {pitch.category} <span className="text-gray-400 font-normal normal-case mx-1">•</span> <span className="text-gray-600 font-normal normal-case">By {pitch.entrepreneurId?.name || 'Unknown'}</span>
                                    </p>

                                    <div className="mb-4">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Problem</h4>
                                        <p className="text-gray-700 text-sm line-clamp-2">{pitch.content.problem}</p>
                                    </div>

                                    <div className="mb-4 flex-1">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Solution</h4>
                                        <p className="text-gray-700 text-sm line-clamp-3">{pitch.content.solution}</p>
                                    </div>

                                    <div className="bg-blue-50 -mx-6 -mb-6 p-6 mt-4 border-t border-blue-100">
                                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-500 uppercase font-semibold">Seeking</span>
                                                <span className="text-lg font-bold text-green-600">${pitch.financials.askAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="w-px h-10 bg-gray-200"></div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-xs text-gray-500 uppercase font-semibold">Equity</span>
                                                <span className="text-lg font-bold text-blue-600">{pitch.financials.equityOffered}%</span>
                                            </div>
                                        </div>
                                        {pitch.financials.isPrivate && (
                                            <p className="text-xs text-center text-gray-500 mt-2 italic flex items-center justify-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                Financials Private
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="px-6 pb-6 pt-0 mt-auto">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleLike(pitch._id)}
                                            className="flex-shrink-0 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex justify-center items-center gap-2"
                                            title="Like Pitch"
                                        >
                                            <span className="text-red-500 text-lg">❤️</span>
                                            <span>{pitch.likes?.length || 0}</span>
                                        </button>
                                        <button
                                            onClick={() => toggleComments(pitch._id)}
                                            className="flex-shrink-0 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex justify-center items-center gap-2"
                                            title="View Comments"
                                        >
                                            <span className="text-blue-500 text-lg">💬</span>
                                        </button>
                                        <button
                                            onClick={() => toggleBidForm(pitch._id)}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex justify-center items-center gap-2 whitespace-nowrap"
                                        >
                                            {activeBidPitchId === pitch._id ? 'Cancel Offer' : 'Make Offer'}
                                        </button>
                                        <button
                                            onClick={() => navigate(`/chat/${pitch.entrepreneurId?._id || pitch.entrepreneurId}`)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200 flex justify-center items-center gap-2"
                                            title="Message Founder"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                        </button>
                                    </div>

                                    {/* Inline Bidding Form */}
                                    {activeBidPitchId === pitch._id && (
                                        <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded-lg animate-fade-in-down">
                                            {bidSuccess === pitch._id ? (
                                                <div className="text-center py-4">
                                                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-2">
                                                        <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-sm leading-5 font-medium text-green-800">Bid Placed Successfully!</h3>
                                                </div>
                                            ) : (
                                                <form onSubmit={(e) => handleBidSubmit(e, pitch._id)}>
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Submit Your Proposal</h4>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Bid Amount ($)</label>
                                                            <input
                                                                type="number"
                                                                name="bidAmount"
                                                                value={bidData.bidAmount}
                                                                onChange={handleBidChange}
                                                                required
                                                                min="1"
                                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                                                placeholder="Amount willing to invest"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Equity Requested (%)</label>
                                                            <input
                                                                type="number"
                                                                name="equityRequested"
                                                                value={bidData.equityRequested}
                                                                onChange={handleBidChange}
                                                                required
                                                                min="0.1" max="100" step="0.1"
                                                                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                                                placeholder="Equity expected in return"
                                                            />
                                                        </div>
                                                        <button
                                                            type="submit"
                                                            disabled={bidLoading}
                                                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${bidLoading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-800 hover:bg-green-900'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors`}
                                                        >
                                                            {bidLoading ? 'Submitting...' : 'Confirm Offer'}
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    )}

                                    {/* Inline Comments Section */}
                                    {activeCommentsPitchId === pitch._id && (
                                        <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg animate-fade-in-down flex flex-col h-72">
                                            <h4 className="text-sm font-semibold text-gray-800 mb-3 border-b border-blue-200 pb-2">Discussion</h4>

                                            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
                                                {commentsLoading ? (
                                                    <div className="text-center text-sm text-blue-600 py-4 flex items-center justify-center">
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                        Loading comments...
                                                    </div>
                                                ) : activePitchComments.length === 0 ? (
                                                    <p className="text-sm text-gray-500 text-center py-4 italic">No comments yet. Be the first to share your thoughts!</p>
                                                ) : (
                                                    activePitchComments.map(comment => (
                                                        <div key={comment._id} className="bg-white p-3 rounded shadow-sm border border-blue-100">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-bold text-gray-800 text-xs">{comment.author?.name || 'Unknown User'}</span>
                                                                <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-700 break-words">{comment.text}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            <form onSubmit={(e) => handleCommentSubmit(e, pitch._id)} className="mt-auto flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newCommentText}
                                                    onChange={(e) => setNewCommentText(e.target.value)}
                                                    placeholder="Add a comment..."
                                                    className="flex-1 px-3 py-2 border border-blue-300 rounded focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                                                    required
                                                />
                                                <button
                                                    type="submit"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded shadow-sm transition-colors duration-200 text-sm"
                                                >
                                                    Post
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
