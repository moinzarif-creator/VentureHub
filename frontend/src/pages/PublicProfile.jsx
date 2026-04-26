import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const PublicProfile = () => {
    const { id } = useParams();
    const [userData, setUserData] = useState(null);
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null); // ADDED
    const [bids, setBids] = useState([]); // UPDATED to array
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get(`http://localhost:5001/api/profiles/public/${id}`);
                setUserData(res.data.user);
                setProfileData(res.data.profile);

                // Fetch current user and check for bids
                const token = localStorage.getItem('token');
                if (token) {
                    const userRes = await axios.get('http://localhost:5001/api/auth/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setCurrentUser(userRes.data);

                    // If viewing an investor, check if they have bid on our pitches
                    if (res.data.user.role === 'Investor') {
                        const bidRes = await axios.get(`http://localhost:5001/api/bids/check/${id}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        setBids(bidRes.data);
                    }
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error fetching profile');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [id]);

    if (loading) return <div className="text-center mt-20 text-lg font-medium text-gray-600 animate-pulse">Loading Profile...</div>;
    if (error) return <div className="text-center mt-20 text-lg font-bold text-red-500">{error}</div>;
    if (!userData) return <div className="text-center mt-20 text-lg font-medium text-gray-500">Profile not found.</div>;

    const isInvestor = userData.role === 'Investor';
    const isEntrepreneur = userData.role === 'Entrepreneur';

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">

                <Link to="/explore" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-6 transition-colors">
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Back to Directory
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-600 to-indigo-700 w-full relative">
                        {/* Banner color */}
                    </div>

                    <div className="relative px-6 pb-8 sm:px-10">
                        <div className="flex flex-col sm:flex-row sm:items-end -mt-16 sm:-mt-20 mb-6">

                            <div className="relative z-10 w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg flex-shrink-0 animate-fade-in-up">
                                {isInvestor && profileData?.avatarUrl && (
                                    <img src={profileData.avatarUrl} alt={userData.name} className="w-full h-full object-cover" />
                                )}
                                {isEntrepreneur && profileData?.logoUrl && (
                                    <img src={profileData.logoUrl} alt={userData.name} className="w-full h-full object-contain p-2" />
                                )}
                                {(!profileData || (!profileData.avatarUrl && !profileData.logoUrl)) && (
                                    <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-400">
                                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 sm:mt-0 sm:ml-6 pb-2">
                                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{userData.name}</h1>

                                <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold tracking-wide shadow-sm
                                        ${isInvestor ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : ''}
                                        ${isEntrepreneur ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : ''}
                                        ${!isInvestor && !isEntrepreneur ? 'bg-gray-100 text-gray-800' : ''}
                                    `}>
                                        {userData.role}
                                    </span>

                                    {isEntrepreneur && profileData?.companyName && (
                                        <span className="text-xl font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                                            🏢 {profileData.companyName}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Profile Content Body */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">

                            <div className="md:col-span-2 space-y-8 animate-fade-in">
                                {isInvestor && (
                                    <>
                                        <section>
                                            <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Investment Thesis</h3>
                                            {profileData?.investmentThesis ? (
                                                <p className="text-gray-700 leading-relaxed text-base bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">{profileData.investmentThesis}</p>
                                            ) : (
                                                <p className="text-gray-400 italic">No investment thesis provided.</p>
                                            )}
                                        </section>

                                        {/* Bid Section for Entrepreneurs */}
                                        {currentUser?.role === 'Entrepreneur' && bids && bids.length > 0 && (
                                            <section className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 shadow-md">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-blue-900 font-black text-xl flex items-center gap-2">
                                                        💰 Latest Bid on Your Pitch
                                                    </h3>
                                                    <span className="bg-blue-600 text-white text-xs font-black px-2 py-1 rounded">ACTIVE</span>
                                                </div>
                                                
                                                {/* Prominent Latest Bid */}
                                                <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm mb-6">
                                                    <p className="text-sm font-bold text-gray-500 mb-2">Pitch: {bids[0].pitchId?.title}</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Offer Amount</p>
                                                            <p className="text-2xl font-black text-blue-600">${bids[0].offerAmount?.toLocaleString()}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Equity Requested</p>
                                                            <p className="text-2xl font-black text-blue-600">{bids[0].offerEquity}%</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bid History (if any more exist) */}
                                                {bids.length > 1 && (
                                                    <div className="mt-4 pt-4 border-t border-blue-100">
                                                        <h4 className="text-sm font-bold text-blue-800 mb-2 uppercase tracking-wider">Previous Bid History</h4>
                                                        <ul className="space-y-2">
                                                            {bids.slice(1).map((bid, index) => (
                                                                <li key={index} className="text-sm text-blue-600 flex justify-between bg-blue-100/50 px-3 py-2 rounded-lg">
                                                                    <span>Previously bid on: <span className="font-bold">{bid.pitchId?.title}</span></span>
                                                                    <span className="font-black">${bid.offerAmount?.toLocaleString()}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </section>
                                        )}

                                        {/* Universal Contact Button for Entrepreneurs viewing an Investor */}
                                        {currentUser?.role === 'Entrepreneur' && isInvestor && (
                                            <section className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between gap-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Ready to Connect?</h3>
                                                    <p className="text-sm text-gray-500">Initiate a private conversation with {userData.name} about your pitches.</p>
                                                </div>
                                                <Link 
                                                    to={`/chat/${userData._id}`}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95"
                                                >
                                                    Message / Contact Investor
                                                </Link>
                                            </section>
                                        )}
                                    </>
                                )}

                                {isEntrepreneur && (
                                    <>
                                        <section className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div>
                                                    <h3 className="text-emerald-800 font-extrabold text-xl mb-1">Funding Goal</h3>
                                                    <div className="text-3xl font-black text-emerald-600 tracking-tight">
                                                        {profileData?.fundingGoal ? `$${profileData.fundingGoal.toLocaleString()}` : <span className="text-emerald-300 text-lg italic">Undisclosed</span>}
                                                    </div>
                                                </div>
                                                <div className="bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Current Stage</span>
                                                    <span className="text-lg font-bold text-gray-800 inline-flex items-center">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                                                        {profileData?.startupStage || 'Startup'}
                                                    </span>
                                                </div>
                                            </div>
                                        </section>
                                    </>
                                )}
                            </div>

                            <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-gray-100 pt-8 md:pt-0 md:pl-8 space-y-8">
                                {isInvestor && (
                                    <>
                                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 text-center shadow-sm">
                                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Typical Check Size</h3>
                                            <div className="text-2xl font-black text-indigo-600 drop-shadow-sm">
                                                {profileData?.typicalCheckSize ? `$${profileData.typicalCheckSize.toLocaleString()}` : <span className="text-gray-400 text-base italic font-medium">Flexible</span>}
                                            </div>
                                        </div>

                                        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-md">
                                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                                Preferred Industries
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {profileData?.preferredIndustries && profileData.preferredIndustries.length > 0 ? (
                                                    profileData.preferredIndustries.map((ind, idx) => (
                                                        <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider">{ind}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-gray-400 italic">Open to all sectors</span>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {isEntrepreneur && (
                                    <>
                                        {profileData?.pitchDeckUrl ? (
                                            <a
                                                href={profileData.pitchDeckUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-2 group"
                                            >
                                                <svg className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                <span className="text-lg tracking-wide">View Pitch Deck</span>
                                                <span className="text-xs text-gray-400 font-medium">PDF Document</span>
                                            </a>
                                        ) : (
                                            <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-6 rounded-xl text-center">
                                                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                <p className="text-sm font-bold text-gray-400">No Pitch Deck Provided</p>
                                            </div>
                                        )}

                                        <div className="mt-4 text-center">
                                            <Link to={`/chat/${userData._id}`} className="text-sm font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-full transition-colors">
                                                💬 Message {userData.name}
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;
