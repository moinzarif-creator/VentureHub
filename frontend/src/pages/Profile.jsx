import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Profile = () => {
    const [pitches, setPitches] = useState([]);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [viewingBidsFor, setViewingBidsFor] = useState(null);
    const [activePitchBids, setActivePitchBids] = useState([]);
    const [bidsLoading, setBidsLoading] = useState(false);
    const [bidsError, setBidsError] = useState('');

    const [kycNidFile, setKycNidFile] = useState(null);
    const [kycTaxFile, setKycTaxFile] = useState(null);
    const [kycLoading, setKycLoading] = useState(false);

    // Payment State
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentAlert, setPaymentAlert] = useState(null);

    // Profile Gamification Form State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [formData, setFormData] = useState({});
    const [fileData, setFileData] = useState({ avatar: null, logo: null, pitchDeck: null });
    const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const paymentStatus = searchParams.get('payment');
        if (paymentStatus === 'success') {
            setPaymentAlert({ type: 'success', message: 'Payment Successful! You are now verified.' });
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentStatus === 'fail') {
            setPaymentAlert({ type: 'error', message: 'Payment failed or was cancelled.' });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        setTimeout(() => setPaymentAlert(null), 5000);

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                
                const [userRes, pitchesRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/pitches/mine`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                
                setUser(userRes.data);
                setPitches(pitchesRes.data);

                // Fetch Role Profile
                try {
                    const profileRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/profiles/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (profileRes.data.profile) {
                        setProfile(profileRes.data.profile);
                        setFormData(profileRes.data.profile);
                        // format preferredIndustries for investor
                        if (userRes.data.role === 'Investor' && profileRes.data.profile.preferredIndustries) {
                             setFormData({...profileRes.data.profile, preferredIndustries: profileRes.data.profile.preferredIndustries.join(', ') });
                        }
                    } else {
                        setProfile({});
                    }
                } catch(pe) {
                    console.log("Could not fetch profile info (might not exist yet)");
                    setProfile({});
                }

            } catch (err) {
                setError(err.response?.data?.message || 'Error fetching your data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const toggleViewBids = async (pitchId) => {
        if (viewingBidsFor === pitchId) {
            setViewingBidsFor(null);
            return;
        }

        setViewingBidsFor(pitchId);
        setBidsLoading(true);
        setBidsError('');
        setActivePitchBids([]);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bids/pitch/${pitchId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setActivePitchBids(res.data);
        } catch (err) {
            setBidsError(err.response?.data?.message || 'Error fetching bids');
        } finally {
            setBidsLoading(false);
        }
    };

    const handleKycSubmit = async (e) => {
        e.preventDefault();
        if (!kycNidFile || !kycTaxFile) return;

        setKycLoading(true);
        const fd = new FormData();
        fd.append('nid', kycNidFile);
        fd.append('taxDocument', kycTaxFile);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/auth/kyc-upload`, fd, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            setUser(res.data);
            setKycNidFile(null);
            setKycTaxFile(null);
        } catch (err) {
            alert(err.response?.data?.message || 'Error uploading KYC documents');
        } finally {
            setKycLoading(false);
        }
    };

    const handlePaymentSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsProcessing(true);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/init`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.GatewayPageURL) {
                window.location.replace(res.data.GatewayPageURL);
            } else {
                throw new Error("No Gateway URL returned");
            }
        } catch (err) {
            alert(err.response?.data?.message || err.message || 'Error initializing payment gateway');
            setIsProcessing(false);
        }
    };

    const handleLike = async (pitchId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/pitches/${pitchId}/like`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

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

    // --- NEW: Profile Update Handler ---
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileUpdateLoading(true);

        const token = localStorage.getItem('token');
        const fd = new FormData();
        
        // Append text fields
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined) {
                fd.append(key, formData[key]);
            }
        });

        // Append file fields
        if (fileData.avatar) fd.append('avatar', fileData.avatar);
        if (fileData.logo) fd.append('logo', fileData.logo);
        if (fileData.pitchDeck) fd.append('pitchDeck', fileData.pitchDeck);

        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/profiles/me`, fd, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setProfile(res.data.profile);
            
            // Re-sync form
            let updatedForm = { ...res.data.profile };
            if (user?.role === 'Investor' && res.data.profile.preferredIndustries) {
                 updatedForm.preferredIndustries = res.data.profile.preferredIndustries.join(', ');
            }
            setFormData(updatedForm);
            
            setIsEditingProfile(false);
            setFileData({ avatar: null, logo: null, pitchDeck: null });
        } catch (err) {
            alert(err.response?.data?.message || 'Error updating profile');
        } finally {
            setProfileUpdateLoading(false);
        }
    };

    const computeCompleteness = () => {
        if (!profile || Object.keys(profile).length === 0) return 0;
        let fields = [];
        if (user?.role === 'Investor') {
            fields = ['investmentThesis', 'preferredIndustries', 'typicalCheckSize', 'avatarUrl'];
        } else if (user?.role === 'Entrepreneur') {
            fields = ['companyName', 'startupStage', 'fundingGoal', 'pitchDeckUrl', 'logoUrl'];
        } else {
            return 100; // default for unknown roles
        }
        let filledCount = fields.filter(f => profile[f] && profile[f].toString().length > 0).length;
        return Math.min(100, Math.round((filledCount / fields.length) * 100));
    };

    const renderMedia = (url) => {
        const isVideo = url.match(/\.(mp4|mov|avi|webm)$/i);
        if (isVideo) {
            return <video src={url} controls className="w-full h-48 object-cover object-center" />;
        }
        return <img src={url} alt="Pitch media" className="w-full h-48 object-cover object-center" />;
    };

    if (loading) return <div className="text-center mt-20 text-lg text-gray-600">Loading profile...</div>;
    if (error) return <div className="text-center mt-20 text-lg text-red-500">{error}</div>;

    const completeness = computeCompleteness();
    const progressColor = completeness === 100 ? 'bg-green-500' : completeness > 50 ? 'bg-blue-500' : 'bg-red-400';

    return (
        <div className="bg-gray-50 min-h-screen p-8 relative">
            <div className="max-w-7xl mx-auto">
                {paymentAlert && (
                    <div className={`mb-6 p-4 rounded-md shadow-sm border-l-4 ${paymentAlert.type === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
                        <div className="flex items-center">
                            <div className="ml-3 font-medium">{paymentAlert.message}</div>
                        </div>
                    </div>
                )}

                {/* --- Profile Completeness Gamification Banner --- */}
                {user && (user.role === 'Investor' || user.role === 'Entrepreneur') && profile !== null && (
                    <div className="mb-10 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                        {/* Progress Bar Container */}
                        <div className="w-full bg-gray-200 h-3">
                            <div className={`h-3 transition-all duration-700 ease-out ${progressColor}`} style={{ width: `${completeness}%` }}></div>
                        </div>
                        <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            
                            <div className="flex items-center gap-6">
                                {/* Avatar Display */}
                                {user.role === 'Investor' && profile.avatarUrl && (
                                    <img src={profile.avatarUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-blue-50 shadow-md" />
                                )}
                                {user.role === 'Entrepreneur' && profile.logoUrl && (
                                    <img src={profile.logoUrl} alt="Logo" className="w-20 h-20 rounded-md object-contain bg-gray-50 border p-1" />
                                )}
                                {((user.role === 'Investor' && !profile.avatarUrl) || (user.role === 'Entrepreneur' && !profile.logoUrl)) && (
                                     <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300">
                                         <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                     </div>
                                )}
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.name} <span className="text-sm font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full ml-2 align-middle">{user.role}</span></h2>
                                    <p className="text-gray-500 font-medium">
                                        Profile Completeness: <span className={completeness === 100 ? 'text-green-600 font-bold' : 'text-blue-600'}>{completeness}%</span>
                                    </p>
                                    {completeness < 100 && (
                                        <p className="text-xs text-gray-400 mt-1">Complete your profile to increase your visibility on the platform!</p>
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setIsEditingProfile(!isEditingProfile)}
                                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg shadow transition-colors flex items-center gap-2"
                            >
                                {isEditingProfile ? 'Cancel Editing' : 'Edit Profile'}
                            </button>
                        </div>

                        {/* Expandable Form */}
                        {isEditingProfile && (
                            <div className="border-t border-gray-100 bg-gray-50 p-6 md:p-8 animate-fade-in-down">
                                <form onSubmit={handleProfileSubmit} className="max-w-3xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        
                                        {/* Investor Fields */}
                                        {user.role === 'Investor' && (
                                            <>
                                                <div className="col-span-1 md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Investment Thesis</label>
                                                    <textarea 
                                                        rows="3" 
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
                                                        placeholder="What drives your investment strategy?"
                                                        value={formData.investmentThesis || ''}
                                                        onChange={(e) => setFormData({...formData, investmentThesis: e.target.value})}
                                                    ></textarea>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Industries</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
                                                        placeholder="e.g. Fintech, Edtech, Saas (comma separated)"
                                                        value={formData.preferredIndustries || ''}
                                                        onChange={(e) => setFormData({...formData, preferredIndustries: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Typical Check Size ($)</label>
                                                    <input 
                                                        type="number" 
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
                                                        placeholder="e.g. 50000"
                                                        value={formData.typicalCheckSize || ''}
                                                        onChange={(e) => setFormData({...formData, typicalCheckSize: e.target.value})}
                                                    />
                                                </div>
                                                <div className="col-span-1 md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Profile Avatar (JPG/PNG)</label>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={(e) => setFileData({...fileData, avatar: e.target.files[0]})}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-md p-1 bg-white"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Entrepreneur Fields */}
                                        {user.role === 'Entrepreneur' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
                                                        placeholder="Your startup's name"
                                                        value={formData.companyName || ''}
                                                        onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Startup Stage</label>
                                                    <select 
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
                                                        value={formData.startupStage || ''}
                                                        onChange={(e) => setFormData({...formData, startupStage: e.target.value})}
                                                    >
                                                        <option value="">Select Stage...</option>
                                                        <option value="Idea">Idea</option>
                                                        <option value="MVP">MVP</option>
                                                        <option value="Seed">Seed</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Funding Goal ($)</label>
                                                    <input 
                                                        type="number" 
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border" 
                                                        placeholder="e.g. 100000"
                                                        value={formData.fundingGoal || ''}
                                                        onChange={(e) => setFormData({...formData, fundingGoal: e.target.value})}
                                                    />
                                                </div>
                                                <div className="col-span-1 md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo (JPG/PNG)</label>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={(e) => setFileData({...fileData, logo: e.target.files[0]})}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-md p-1 bg-white"
                                                    />
                                                </div>
                                                <div className="col-span-1 md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pitch Deck (PDF)</label>
                                                    <input 
                                                        type="file" 
                                                        accept=".pdf"
                                                        onChange={(e) => setFileData({...fileData, pitchDeck: e.target.files[0]})}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 border border-gray-200 rounded-md p-1 bg-white"
                                                    />
                                                    {profile.pitchDeckUrl && (
                                                        <a href={profile.pitchDeckUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">🚀 View Current Deck</a>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button 
                                            type="submit" 
                                            disabled={profileUpdateLoading}
                                            className={`px-6 py-2.5 rounded-lg text-white font-bold shadow-md transition-colors ${profileUpdateLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                        >
                                            {profileUpdateLoading ? 'Saving...' : 'Save Profile Details'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                )}


                {/* KYC Verification Banner */}
                {user && (
                    <div className="mb-10">
                        {user.isVerified ? (
                            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md shadow-sm">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-bold text-green-800">Verified User</h3>
                                        <p className="text-sm text-green-700 mt-1">Identity confirmed and verification fee paid.</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {user.verificationStatus === 'approved' && !user.hasPaidKycFee && (
                                    <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-bold text-blue-800">Documents Approved! Action Required.</h3>
                                                <p className="text-sm text-blue-700 mt-1">Your documents passed our checks. Please pay the one-time verification fee to unlock your green badge.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handlePaymentSubmit}
                                            disabled={isProcessing}
                                            className={`whitespace-nowrap inline-flex items-center justify-center px-4 py-2 border border-transparent font-medium rounded-md text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                        >
                                            {isProcessing ? 'Redirecting...' : 'Pay Fee (500 BDT)'}
                                        </button>
                                    </div>
                                )}
                                {user.verificationStatus === 'unverified' && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-800">Verification Required</h3>
                                                <p className="text-sm text-red-700 mt-1">Please verify your identity to fully access VentureHive. Your status is unverified.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {user.verificationStatus === 'pending' && (
                                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-md shadow-sm">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-yellow-800">Under Review</h3>
                                                <p className="text-sm text-yellow-700 mt-1">Your KYC documents are currently being reviewed by our team.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {user.verificationStatus === 'rejected' && (
                                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <h3 className="text-sm font-medium text-red-800">Verification Rejected</h3>
                                                <p className="text-sm text-red-700 mt-1">Your previous KYC submission was rejected. Please upload clear copies of your documents.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* KYC Upload Form */}
                        {(user.verificationStatus === 'unverified' || user.verificationStatus === 'rejected') && !user.isVerified && (
                            <div className="mt-6 bg-white p-6 rounded-xl shadow-md border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Upload KYC Documents</h3>
                                <p className="text-sm text-gray-600 mb-4">To ensure trust on VentureHive, we require copies of your National ID and Tax Document.</p>
                                <form onSubmit={handleKycSubmit} className="flex flex-col gap-4 max-w-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">National ID (PDF, JPG, PNG)</label>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => setKycNidFile(e.target.files[0])}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-lg p-2 transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax Document (PDF, JPG, PNG)</label>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => setKycTaxFile(e.target.files[0])}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-lg p-2 transition-colors"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!kycNidFile || !kycTaxFile || kycLoading}
                                        className={`self-start px-6 py-2.5 rounded-lg text-white font-medium shadow-sm transition-colors ${!kycNidFile || !kycTaxFile || kycLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                    >
                                        {kycLoading ? 'Uploading Documents...' : 'Submit Verification Documents'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                <h2 className="text-3xl font-bold text-gray-800 mb-6">My Pitches / Applications</h2>

                {pitches.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
                        <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        <p className="text-xl text-gray-600 mb-6">You haven't interacted with any pitches yet!</p>
                        <Link to="/create-pitch" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-shadow">
                            Create a Pitch Now
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {pitches.map((pitch) => (
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
                                    <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1">{pitch.title}</h3>
                                    <p className="text-sm font-medium text-blue-600 mb-4 tracking-wide uppercase">
                                        {pitch.category}
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
                                        >
                                            <span className="text-red-500 text-lg">❤️</span>
                                            <span>{pitch.likes?.length || 0}</span>
                                        </button>
                                        <button
                                            onClick={() => toggleViewBids(pitch._id)}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-sm transition-colors duration-200"
                                        >
                                            {viewingBidsFor === pitch._id ? 'Hide Offers' : 'View Offers'}
                                        </button>
                                    </div>

                                    {/* Inline Bids View */}
                                    {viewingBidsFor === pitch._id && (
                                        <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-lg animate-fade-in-down">
                                            {bidsLoading ? (
                                                <div className="text-center text-sm text-blue-600 py-2 flex items-center justify-center">
                                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                    Loading offers...
                                                </div>
                                            ) : bidsError ? (
                                                <div className="text-center text-sm text-red-500 py-2">{bidsError}</div>
                                            ) : activePitchBids.length === 0 ? (
                                                <div className="text-center text-sm text-gray-600 py-2 font-medium">No offers yet.</div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-2 border-b border-blue-200 pb-1">Current Offers ({activePitchBids.length})</h4>
                                                    {activePitchBids.map(bid => (
                                                        <div key={bid._id} className="bg-white p-3 rounded border border-blue-100 shadow-sm text-sm flex justify-between items-center bg-gradient-to-r from-white to-blue-50/30">
                                                            <div>
                                                                <span className="font-semibold text-gray-800">{bid.investorId?.name || 'Unknown Investor'}</span>
                                                                <p className="text-xs text-gray-500 mt-1">Requested <span className="font-medium text-gray-700">{bid.offerEquity}%</span> equity</p>
                                                                {bid.termsAndConditions && (
                                                                    <p className="text-xs text-gray-600 mt-2 bg-white p-2 rounded border border-gray-100 italic">
                                                                        <span className="font-semibold text-gray-500 not-italic block mb-0.5">Terms:</span>
                                                                        {bid.termsAndConditions}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="font-bold text-green-600 text-base">
                                                                ${bid.offerAmount ? bid.offerAmount.toLocaleString() : '0'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
