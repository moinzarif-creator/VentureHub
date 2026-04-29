import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PitchSelectionModal from '../components/PitchSelectionModal';
import { useToast } from '../context/ToastContext';

const Explore = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [users, setUsers] = useState([]);
    const [manualResults, setManualResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('All'); // 'All', 'Investor', 'Entrepreneur'
    const [currentUser, setCurrentUser] = useState(null);
    
    // Manual Search State
    const [isManualSearch, setIsManualSearch] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [industryFilter, setIndustryFilter] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // Bid State — IDs of investors who have already bid on this entrepreneur's pitches
    const [bidderIds, setBidderIds] = useState(new Set());

    // Modal State
    const [selectedInvestor, setSelectedInvestor] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const [meRes, matchesRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/explore/matches`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                const me = meRes.data;
                setCurrentUser(me);
                setUsers(matchesRes.data);

                // If the viewer is an Entrepreneur, fetch all investors who have
                // already bid on any of their pitches so we can hide "Send Pitch".
                if (me.role === 'Entrepreneur') {
                    try {
                        const bidsRes = await axios.get(
                            `${import.meta.env.VITE_API_URL}/api/bids/my-received`,
                            { headers: { 'Authorization': `Bearer ${token}` } }
                        );
                        const ids = new Set(bidsRes.data.map(b =>
                            b.investorId?._id || b.investorId
                        ));
                        setBidderIds(ids);
                    } catch {
                        // Non-fatal: if this endpoint isn't available, gracefully
                        // degrade — the button will still show for all investors.
                    }
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch the directory. Ensure you have saved your profile first to generate an AI embedding!');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleManualSearch = async (e) => {
        if (e) e.preventDefault();
        setSearchLoading(true);
        setIsManualSearch(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/explore/search-investors`, {
                headers: { 'Authorization': `Bearer ${token}` },
                params: { search: searchTerm, industry: industryFilter }
            });
            setManualResults(res.data);
        } catch (err) {
            console.error('Search error', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const displayUsers = isManualSearch ? manualResults : (filter === 'All' ? users : users.filter(u => u.role === filter));

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
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
                        {isManualSearch ? 'Investor Directory' : 'AI Matchmaking Engine'}
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        {isManualSearch 
                            ? 'Find and connect with investors manually by name or industry interest.' 
                            : 'Discover highly compatible Investors and Entrepreneurs securely sorted by our Vector Matching algorithm.'}
                    </p>
                </div>

                {/* Manual Search Bar for Entrepreneurs */}
                {currentUser?.role === 'Entrepreneur' && (
                    <div className="max-w-4xl mx-auto mb-10">
                        <form onSubmit={handleManualSearch} className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-3xl shadow-lg border border-gray-100">
                            <div className="flex-1 relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </span>
                                <input 
                                    type="text" 
                                    placeholder="Search Investor by Name..." 
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="md:w-64 relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                </span>
                                <select 
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                                    value={industryFilter}
                                    onChange={(e) => setIndustryFilter(e.target.value)}
                                >
                                    <option value="">All Industries</option>
                                    <option value="Fintech">Fintech</option>
                                    <option value="Healthcare">Healthcare</option>
                                    <option value="EdTech">EdTech</option>
                                    <option value="E-commerce">E-commerce</option>
                                    <option value="AI">AI/Machine Learning</option>
                                    <option value="GreenTech">GreenTech</option>
                                    <option value="SaaS">SaaS</option>
                                    <option value="Blockchain">Blockchain/Crypto</option>
                                    <option value="Consumer">Consumer</option>
                                </select>
                            </div>
                            <button 
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                                disabled={searchLoading}
                            >
                                {searchLoading ? 'Searching...' : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                        Search
                                    </>
                                )}
                            </button>
                        </form>
                        {isManualSearch && (
                            <div className="text-center mt-4">
                                <button 
                                    onClick={() => { setIsManualSearch(false); setSearchTerm(''); setIndustryFilter(''); }}
                                    className="text-sm font-bold text-blue-600 hover:underline"
                                >
                                    ← Back to AI Matchmaking
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Matching Filters (only if not in manual search) */}
                {!isManualSearch && (
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
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayUsers.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                            {isManualSearch ? 'No investors found matching your search criteria.' : 'No users found in this category.'}
                        </div>
                    ) : (
                        displayUsers.map(user => (
                            <div 
                                key={user._id} 
                                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col items-center p-6 transform hover:-translate-y-1 relative"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                
                                {/* Synergy Score Badge */}
                                {!isManualSearch && user.synergyScore !== undefined && (
                                    <div className={`absolute top-4 right-4 px-2 py-1 rounded-md text-xs font-black shadow-sm flex items-center gap-1 z-10
                                        ${user.synergyScore > 80 ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm animate-pulse-subtle' : ''}
                                        ${user.synergyScore <= 80 && user.synergyScore > 50 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : ''}
                                        ${user.synergyScore <= 50 ? 'bg-gray-100 text-gray-400 border border-gray-200' : ''}
                                    `}>
                                        {user.synergyScore > 80 ? '🔥 High Match' : user.synergyScore > 50 ? 'Solid Match' : 'Low Synergy'} ({user.synergyScore}%)
                                    </div>
                                )}

                                <Link to={`/profile/${user._id}`} className="flex flex-col items-center w-full">
                                    <div className="w-24 h-24 rounded-full border-4 border-gray-50 bg-gray-100 mb-4 overflow-hidden shadow-inner flex-shrink-0 flex items-center justify-center mt-4 relative">
                                        {(user.avatarUrl || user.logoUrl) ? (
                                            <img src={user.avatarUrl || user.logoUrl} alt={user.name} className={`w-full h-full ${user.role === 'Entrepreneur' ? 'object-contain p-2' : 'object-cover'}`} />
                                        ) : (
                                            <span className="text-3xl font-black text-gray-300">{user.name?.charAt(0)}</span>
                                        )}
                                        {user.isVerified && (
                                            <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 border-2 border-white shadow-sm">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"></path></svg>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-gray-900 text-center line-clamp-1 flex items-center gap-1">
                                        {user.name}
                                    </h3>
                                    
                                    <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase
                                        ${user.role === 'Investor' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}
                                    `}>
                                        {user.role}
                                    </span>

                                    <div className="mt-4 flex-1 w-full text-center min-h-[40px]">
                                        {user.role === 'Investor' && (
                                            <>
                                                {user.tagline && <p className="text-sm text-gray-500 line-clamp-2 italic mb-2">"{user.tagline}"</p>}
                                                {user.preferredIndustries && (
                                                    <div className="flex flex-wrap justify-center gap-1">
                                                        {user.preferredIndustries.slice(0, 3).map((ind, i) => (
                                                            <span key={i} className="text-[9px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase">{ind}</span>
                                                        ))}
                                                        {user.preferredIndustries.length > 3 && <span className="text-[9px] font-black text-gray-300">+{user.preferredIndustries.length - 3} more</span>}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {user.role === 'Entrepreneur' && user.companyName && (
                                            <p className="text-sm font-bold text-gray-700 bg-gray-50 py-1.5 rounded-lg border border-gray-100 px-3">🏢 {user.companyName}</p>
                                        )}
                                    </div>
                                </Link>

                                {/* Action Buttons */}
                                <div className="mt-6 flex flex-col w-full gap-2">
                                    <button 
                                        onClick={() => navigate(`/chat/${user._id}`)}
                                        className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-100 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                        Message
                                    </button>
                                    
                                    {/* Hide "Send Pitch" if this investor has already bid on the entrepreneur's pitch */}
                                    {currentUser?.role === 'Entrepreneur' && user.role === 'Investor' && !bidderIds.has(user._id) && (
                                        <button 
                                            onClick={() => setSelectedInvestor({ id: user._id, name: user.name })}
                                            className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                            Send Pitch
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Pitch Selection Modal */}
            {selectedInvestor && (
                <PitchSelectionModal 
                    investorId={selectedInvestor.id}
                    investorName={selectedInvestor.name}
                    onClose={() => setSelectedInvestor(null)}
                    onPitchSent={() => {
                        toast.success(`Pitch sent to ${selectedInvestor.name}!`);
                    }}
                />
            )}
        </div>
    );
};

export default Explore;
