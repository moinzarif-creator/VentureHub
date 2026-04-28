import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const PitchDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [pitch, setPitch] = useState(null);
    const [currentUser, setCurrentUser] = useState(null); // ADDED
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPitch = async () => {
            try {
                const token = localStorage.getItem('token');
                const [pitchRes, userRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/pitches/${id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);
                setPitch(pitchRes.data);
                setCurrentUser(userRes.data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching pitch details", err);
                setError("Could not load pitch details. It might have been removed.");
                setLoading(false);
            }
        };

        fetchPitch();
    }, [id]);

    const [bidData, setBidData] = useState({ offerAmount: '', offerEquity: '', termsAndConditions: '' });
    const [bidLoading, setBidLoading] = useState(false);
    const [bidSuccess, setBidSuccess] = useState(false);
    const [showBidForm, setShowBidForm] = useState(false);

    const handleBidSubmit = async (e) => {
        e.preventDefault();
        setBidLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL}/api/bids`, {
                pitchId: id,
                ...bidData
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setBidSuccess(true);
            toast.success('Investment offer submitted successfully!');
            setTimeout(() => setShowBidForm(false), 3000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error submitting bid');
        } finally {
            setBidLoading(false);
        }
    };

    if (loading) return <div className="text-center mt-20 text-gray-500 animate-pulse">Loading pitch details...</div>;
    if (error) return (
        <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-xl shadow-md text-center">
            <p className="text-red-500 mb-4 font-bold">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Back to Dashboard</button>
        </div>
    );

    const isOwner = currentUser?._id === (pitch.entrepreneurId?._id || pitch.entrepreneurId);
    const isInvestor = currentUser?.role === 'Investor';

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-fade-in">
            <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-gray-600 hover:text-blue-600 font-bold transition-colors">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back
            </button>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 mb-10">
                <div className="p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 mb-2 leading-tight">{pitch.title}</h1>
                            <div className="flex gap-2 items-center">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-200">
                                    {pitch.category}
                                </span>
                                {pitch.tags?.map(tag => (
                                    <span key={tag} className="text-[10px] font-bold text-gray-400">#{tag}</span>
                                ))}
                            </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-right min-w-[200px]">
                            <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-1">Asking For</p>
                            <p className="text-3xl font-black text-green-600">${pitch.financials?.askAmount?.toLocaleString()}</p>
                            <p className="text-sm text-green-600/70 font-bold mt-1">for {pitch.financials?.equityOffered}% Equity</p>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <section>
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-4">
                                <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm italic">P</span>
                                The Problem
                            </h3>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-lg bg-gray-50 p-6 rounded-2xl border border-gray-100 italic">"{pitch.content?.problem}"</p>
                        </section>

                        <section>
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-4">
                                <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm italic">S</span>
                                The Solution
                            </h3>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg p-2">{pitch.content?.solution}</p>
                        </section>
                    </div>

                    {pitch.content?.mediaUrls?.length > 0 && (
                        <div className="mt-12">
                            <h3 className="text-xl font-black text-gray-900 mb-6">Gallery</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {pitch.content.mediaUrls.map((url, index) => (
                                    <div key={index} className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 transform transition-transform hover:scale-[1.02]">
                                        {url.match(/\.(mp4|mov|avi|webm)$/i) ? (
                                            <video src={url} controls className="w-full h-64 object-cover" />
                                        ) : (
                                            <img src={url} alt={`Media ${index}`} className="w-full h-64 object-cover" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="bg-gray-900 px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                            {pitch.entrepreneurId?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                            <p className="text-lg font-black text-white">{pitch.entrepreneurId?.name}</p>
                            <p className="text-sm text-blue-400 font-bold uppercase tracking-widest">Founder / Entrepreneur</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        {!isOwner && (
                            <button 
                                onClick={() => navigate(`/chat/${pitch.entrepreneurId?._id || pitch.entrepreneurId}`)}
                                className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-2xl font-black transition-all border border-white/10"
                            >
                                Message Founder
                            </button>
                        )}
                        
                        {!isOwner && isInvestor && (
                            <button 
                                onClick={() => setShowBidForm(!showBidForm)}
                                className="bg-green-500 hover:bg-green-400 text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-green-900/20 transition-all transform active:scale-95"
                            >
                                {showBidForm ? 'Cancel Offer' : 'Make Investment Offer'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {showBidForm && (
                <div className="bg-white rounded-3xl shadow-2xl p-8 border-2 border-green-500 animate-fade-in-up">
                    {bidSuccess ? (
                        <div className="text-center py-10">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Offer Submitted!</h2>
                            <p className="text-gray-500">The founder has been notified of your interest.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleBidSubmit}>
                            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                <span className="text-green-500">💰</span> Submit Your Proposal
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Investment Amount ($)</label>
                                    <input 
                                        type="number" 
                                        required
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-green-500 font-bold"
                                        placeholder="e.g. 50000"
                                        value={bidData.offerAmount}
                                        onChange={(e) => setBidData({...bidData, offerAmount: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Equity Requested (%)</label>
                                    <input 
                                        type="number" 
                                        step="0.1"
                                        required
                                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-green-500 font-bold"
                                        placeholder="e.g. 5.0"
                                        value={bidData.offerEquity}
                                        onChange={(e) => setBidData({...bidData, offerEquity: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="mb-8">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Special Terms & Conditions</label>
                                <textarea 
                                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-green-500 font-bold h-32"
                                    placeholder="e.g. Board seat required, milestones, etc."
                                    value={bidData.termsAndConditions}
                                    onChange={(e) => setBidData({...bidData, termsAndConditions: e.target.value})}
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={bidLoading}
                                className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl disabled:opacity-50"
                            >
                                {bidLoading ? 'Submitting Offer...' : 'Confirm & Send Investment Offer'}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default PitchDetail;
