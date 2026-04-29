import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const BidView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [bid, setBid] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const fetchBidAndUser = async () => {
            try {
                const token = localStorage.getItem('token');
                
                // Get current user to determine permissions
                const userRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setCurrentUser(userRes.data);

                // Get bid details
                const bidRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/bids/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setBid(bidRes.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load bid details.');
            } finally {
                setLoading(false);
            }
        };

        fetchBidAndUser();
    }, [id]);

    const handleAcceptDeal = async () => {
        if (!window.confirm("Are you sure you want to ACCEPT this deal? This will finalize the funding and reject all other pending bids.")) return;
        
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/bids/${id}/accept`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Deal Accepted Successfully! Congratulations!');
            setBid(res.data.bid);
            navigate('/bids-hub');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to accept deal.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectDeal = async () => {
        if (!window.confirm("Are you sure you want to REJECT this deal? This action cannot be undone.")) return;

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/bids/${id}/reject`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Deal Rejected.');
            setBid(res.data.bid);
            navigate('/bids-hub');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reject deal.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="text-center mt-20 text-lg font-medium text-gray-600 animate-pulse">Loading Deal Room...</div>;
    if (error) return <div className="text-center mt-20 text-lg font-bold text-red-500">{error}</div>;
    if (!bid) return <div className="text-center mt-20 text-lg text-gray-500">Bid not found.</div>;

    const isEntrepreneur = currentUser && bid.pitchId?.entrepreneurId?._id === currentUser._id;
    const isPendingFinal = bid.isFinalBid && (!bid.dealStatus || bid.dealStatus === 'Pending');

    return (
        <div className="bg-gray-50 min-h-screen py-10 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
                
                <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-gray-800 mb-6 transition-colors">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Back
                </button>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    
                    {/* Header Banner */}
                    <div className={`px-8 py-6 text-white flex justify-between items-center
                        ${bid.dealStatus === 'Accepted' ? 'bg-green-600' : 
                          bid.dealStatus === 'Rejected' ? 'bg-red-600' : 
                          bid.isFinalBid ? 'bg-emerald-600' : 'bg-indigo-600'}
                    `}>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
                                {bid.dealStatus === 'Accepted' && '🤝 Deal Finalized'}
                                {bid.dealStatus === 'Rejected' && '❌ Deal Rejected'}
                                {(!bid.dealStatus || bid.dealStatus === 'Pending') && bid.isFinalBid && '📜 Final Offer'}
                                {(!bid.dealStatus || bid.dealStatus === 'Pending') && !bid.isFinalBid && '💬 Initial Exploratory Bid'}
                            </h2>
                            <p className="text-white text-opacity-80 mt-1 font-medium text-sm">
                                Placed on {new Date(bid.createdAt).toLocaleString()}
                            </p>
                        </div>
                        {bid.dealStatus && bid.dealStatus !== 'Pending' && (
                            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-lg font-bold text-xl uppercase tracking-widest backdrop-blur-sm">
                                {bid.dealStatus}
                            </span>
                        )}
                    </div>

                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            
                            {/* Left Column: Financials */}
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">The Offer</h3>
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-inner">
                                        <div className="mb-6">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Investment Amount</p>
                                            <p className="text-4xl font-black text-green-600">${bid.offerAmount?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Equity Requested</p>
                                            <p className="text-3xl font-black text-blue-600">{bid.offerEquity}%</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">Terms & Conditions</h3>
                                    <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 text-yellow-900 shadow-sm text-sm leading-relaxed">
                                        {bid.termsAndConditions ? (
                                            <p className="italic font-medium">"{bid.termsAndConditions}"</p>
                                        ) : (
                                            <p className="italic text-gray-400">No specific terms provided by the investor.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Parties Involved */}
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 border-b pb-2">Parties Involved</h3>
                                    
                                    <div className="flex flex-col gap-4">
                                        {/* Investor Card */}
                                        <div className="flex items-center gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
                                                {bid.investorId?.name?.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Investor</p>
                                                <Link to={`/profile/${bid.investorId?._id}`} className="font-bold text-gray-900 hover:text-indigo-600 text-lg">
                                                    {bid.investorId?.name}
                                                </Link>
                                            </div>
                                            <Link to={`/chat/${bid.investorId?._id}`} className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-full transition-colors" title="Message Investor">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                            </Link>
                                        </div>

                                        {/* Connect Icon */}
                                        <div className="flex justify-center -my-2 z-10">
                                            <div className="bg-gray-100 rounded-full p-2 border-4 border-white">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
                                            </div>
                                        </div>

                                        {/* Pitch/Entrepreneur Card */}
                                        <div className="flex items-center gap-4 bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">
                                                P
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wide">Target Pitch</p>
                                                <Link to={`/dashboard/pitch/${bid.pitchId?._id}`} className="font-bold text-gray-900 hover:text-emerald-600 text-lg line-clamp-1">
                                                    {bid.pitchId?.title}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {bid.isFinalBid && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-blue-800 text-sm flex gap-3 shadow-sm">
                                        <svg className="w-6 h-6 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                        <div>
                                            <p className="font-bold mb-1">Due Diligence Verified</p>
                                            <p className="text-xs opacity-90">The investor has attested to completing financial, legal, technical, and reference checks.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Bar (Only for Entrepreneur on Pending Final Bids) */}
                    {isEntrepreneur && isPendingFinal && (
                        <div className="bg-gray-100 p-8 border-t border-gray-200">
                            <h3 className="text-center text-lg font-black text-gray-800 mb-6 uppercase tracking-widest">Finalize Decision</h3>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
                                <button
                                    onClick={handleRejectDeal}
                                    disabled={actionLoading}
                                    className="flex-1 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 font-black py-4 px-6 rounded-xl transition-all shadow-sm transform active:scale-95 flex justify-center items-center gap-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    Reject Deal
                                </button>
                                <button
                                    onClick={handleAcceptDeal}
                                    disabled={actionLoading}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-black py-4 px-6 rounded-xl transition-all shadow-lg shadow-green-200 transform active:scale-95 flex justify-center items-center gap-2"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    Accept Deal
                                </button>
                            </div>
                            <p className="text-center text-xs text-gray-400 mt-4 font-medium">Accepting this deal will automatically reject all other pending bids on this pitch.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BidView;
