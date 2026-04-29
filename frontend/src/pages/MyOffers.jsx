import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const MyOffers = () => {
    const toast = useToast();
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [ddModalOpen, setDdModalOpen] = useState(false);
    const [selectedBidId, setSelectedBidId] = useState(null);
    const [ddChecks, setDdChecks] = useState({
        financial: false,
        legal: false,
        technical: false,
        reference: false
    });
    const [submittingFinal, setSubmittingFinal] = useState(false);

    useEffect(() => {
        fetchMyOffers();
    }, []);

    const fetchMyOffers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bids/my-offers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setBids(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch offers.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDDModal = (bidId) => {
        setSelectedBidId(bidId);
        setDdChecks({ financial: false, legal: false, technical: false, reference: false });
        setDdModalOpen(true);
    };

    const handleCheckboxChange = (e) => {
        setDdChecks({ ...ddChecks, [e.target.name]: e.target.checked });
    };

    const isAllChecked = Object.values(ddChecks).every(val => val === true);

    const submitFinalBid = async () => {
        if (!isAllChecked || !selectedBidId) return;

        setSubmittingFinal(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${import.meta.env.VITE_API_URL}/api/bids/${selectedBidId}/final`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            toast.success('Final bid submitted successfully!');
            setDdModalOpen(false);
            fetchMyOffers(); // Refresh the list
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit final bid.');
        } finally {
            setSubmittingFinal(false);
        }
    };

    if (loading) return <div className="text-center mt-20 text-lg text-gray-600">Loading your offers...</div>;
    if (error) return <div className="text-center mt-20 text-lg text-red-500">{error}</div>;

    return (
        <div className="bg-gray-50 min-h-screen p-8">
            <div className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-8 border-b pb-4">My Offers</h2>

                {bids.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                        <h3 className="text-xl font-bold text-gray-700">No Active Offers</h3>
                        <p className="text-gray-500 mt-2">You haven't placed any bids yet. Explore pitches to find your next investment!</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {bids.map(bid => (
                            <div key={bid._id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{bid.pitchId?.title || 'Unknown Pitch'}</h3>
                                            <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">
                                                {bid.pitchId?.category || 'Category'}
                                            </p>
                                        </div>
                                        <div>
                                            {bid.dealStatus === 'Accepted' && <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">DEAL ACCEPTED</span>}
                                            {bid.dealStatus === 'Rejected' && <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full border border-red-200">REJECTED</span>}
                                            {(!bid.dealStatus || bid.dealStatus === 'Pending') && bid.isFinalBid && <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">FINAL BID SUBMITTED</span>}
                                            {(!bid.dealStatus || bid.dealStatus === 'Pending') && !bid.isFinalBid && <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full border border-yellow-200">INITIAL OFFER</span>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Your Offer</p>
                                            <p className="text-xl font-black text-green-600">${bid.offerAmount?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Equity Req.</p>
                                            <p className="text-xl font-black text-blue-600">{bid.offerEquity}%</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Terms</p>
                                            <p className="text-sm text-gray-700 italic truncate" title={bid.termsAndConditions}>{bid.termsAndConditions || 'None specified'}</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        {!bid.isFinalBid && (!bid.dealStatus || bid.dealStatus === 'Pending') && (
                                            <button
                                                onClick={() => handleOpenDDModal(bid._id)}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-colors transform active:scale-95"
                                            >
                                                Submit Final Bid
                                            </button>
                                        )}
                                        {bid.isFinalBid && (!bid.dealStatus || bid.dealStatus === 'Pending') && (
                                            <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                Awaiting Entrepreneur's Response
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Due Diligence Modal */}
            {ddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up">
                        <div className="bg-indigo-600 p-6 text-white text-center relative">
                            <h3 className="text-2xl font-black tracking-tight">Due Diligence Audit</h3>
                            <p className="text-indigo-200 text-sm mt-1">Mandatory checklist before submitting a final bid</p>
                            <button onClick={() => setDdModalOpen(false)} className="absolute top-4 right-4 text-white hover:text-indigo-200">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="space-y-4">
                                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" name="financial" checked={ddChecks.financial} onChange={handleCheckboxChange} className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                    <div>
                                        <p className="font-bold text-gray-900">Financial Audit Performed</p>
                                        <p className="text-xs text-gray-500">I have reviewed all financials and projections.</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" name="legal" checked={ddChecks.legal} onChange={handleCheckboxChange} className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                    <div>
                                        <p className="font-bold text-gray-900">Legal & IP Verification Complete</p>
                                        <p className="text-xs text-gray-500">I have verified patents, trademarks, and legal standing.</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" name="technical" checked={ddChecks.technical} onChange={handleCheckboxChange} className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                    <div>
                                        <p className="font-bold text-gray-900">Technical Review Finished</p>
                                        <p className="text-xs text-gray-500">The technology stack and feasibility have been assessed.</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" name="reference" checked={ddChecks.reference} onChange={handleCheckboxChange} className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                                    <div>
                                        <p className="font-bold text-gray-900">Reference Checks Complete</p>
                                        <p className="text-xs text-gray-500">Founder background and team history verified.</p>
                                    </div>
                                </label>
                            </div>

                            <div className="mt-8">
                                <button
                                    onClick={submitFinalBid}
                                    disabled={!isAllChecked || submittingFinal}
                                    className={`w-full py-4 rounded-xl font-black text-lg transition-all shadow-md ${isAllChecked && !submittingFinal ? 'bg-indigo-600 hover:bg-indigo-700 text-white transform active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                >
                                    {submittingFinal ? 'Submitting...' : 'Submit Final Offer'}
                                </button>
                                {!isAllChecked && (
                                    <p className="text-center text-xs text-red-500 mt-2 font-semibold">Please complete all checklist items to proceed.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyOffers;
