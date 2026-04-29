import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BidsHub = () => {
    const navigate = useNavigate();
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('initial'); // 'initial' or 'final'

    useEffect(() => {
        fetchHubBids();
    }, []);

    const fetchHubBids = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bids/entrepreneur/hub`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setBids(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch bids.');
        } finally {
            setLoading(false);
        }
    };

    // Filter logic for Tab 1 (Initial Bids)
    // We only want the latest isFinalBid: false per investor/pitch combination.
    // Assuming backend returns sorted by createdAt DESC, the first one encountered is the latest.
    const initialBids = bids.filter(b => !b.isFinalBid && (!b.dealStatus || b.dealStatus === 'Pending'));
    const latestInitialBidsMap = new Map();
    initialBids.forEach(bid => {
        const key = `${bid.pitchId?._id}_${bid.investorId?._id}`;
        if (!latestInitialBidsMap.has(key)) {
            latestInitialBidsMap.set(key, bid);
        }
    });
    const latestInitialBids = Array.from(latestInitialBidsMap.values());

    // Filter logic for Tab 2 (Final Offers)
    const finalOffers = bids.filter(b => b.isFinalBid && (!b.dealStatus || b.dealStatus === 'Pending'));

    if (loading) return <div className="text-center mt-20 text-lg font-medium text-gray-600 animate-pulse">Loading Bids Hub...</div>;
    if (error) return <div className="text-center mt-20 text-lg font-bold text-red-500">{error}</div>;

    const displayBids = activeTab === 'initial' ? latestInitialBids : finalOffers;

    return (
        <div className="bg-gray-50 min-h-screen p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
                    <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Bids Hub</h2>
                    <div className="flex bg-gray-200 p-1 rounded-xl shadow-inner">
                        <button
                            onClick={() => setActiveTab('initial')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'initial' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Initial Bids
                            <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full ${activeTab === 'initial' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-300 text-gray-600'}`}>
                                {latestInitialBids.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('final')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'final' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Final Offers
                            <span className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs rounded-full ${activeTab === 'final' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-300 text-gray-600'}`}>
                                {finalOffers.length}
                            </span>
                        </button>
                    </div>
                </div>

                {displayBids.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                        <svg className="w-20 h-20 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <h3 className="text-2xl font-bold text-gray-400">No {activeTab === 'initial' ? 'Initial Bids' : 'Final Offers'} Found</h3>
                        <p className="text-gray-500 mt-2">When investors make offers on your pitches, they will appear here.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {displayBids.map(bid => (
                            <div 
                                key={bid._id} 
                                onClick={() => navigate(`/bid/${bid._id}`)}
                                className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group
                                    ${activeTab === 'final' ? 'border-emerald-100 hover:border-emerald-300' : 'border-indigo-50 hover:border-indigo-200'}`}
                            >
                                <div className={`p-6 border-b ${activeTab === 'final' ? 'bg-gradient-to-r from-emerald-50 to-teal-50' : 'bg-gray-50'}`}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden shadow-sm">
                                            {bid.investorId?.avatarUrl ? (
                                                <img src={bid.investorId.avatarUrl} alt="Investor" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-white">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{bid.investorId?.name || 'Unknown Investor'}</h4>
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{bid.investorId?.role || 'Investor'}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-gray-800 line-clamp-1">{bid.pitchId?.title}</h3>
                                </div>

                                <div className="p-6 bg-white">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Offered Amount</p>
                                            <p className={`text-2xl font-black ${activeTab === 'final' ? 'text-emerald-600' : 'text-indigo-600'}`}>${bid.offerAmount?.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Equity</p>
                                            <p className="text-xl font-bold text-gray-700">{bid.offerEquity}%</p>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                        <span className="text-xs text-gray-400 font-medium">
                                            {new Date(bid.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className={`text-sm font-bold flex items-center gap-1 ${activeTab === 'final' ? 'text-emerald-600 group-hover:text-emerald-800' : 'text-indigo-600 group-hover:text-indigo-800'}`}>
                                            View Details
                                            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                        </span>
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

export default BidsHub;
