import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const PitchDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pitch, setPitch] = useState(null);
    const [currentUser, setCurrentUser] = useState(null); // ADDED
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPitch = async () => {
            try {
                const token = localStorage.getItem('token');
                // Note: We don't have a single GET /pitches/:id route yet in the plan, 
                // but we can fetch all and filter or add the route.
                // For now, let's assume we add GET /api/pitches/:id
                const res = await axios.get(`http://localhost:5001/api/pitches/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPitch(res.data);
                
                // Fetch current user
                const userRes = await axios.get('http://localhost:5001/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
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

    if (loading) return <div className="text-center mt-20 text-gray-500">Loading pitch details...</div>;
    if (error) return (
        <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-xl shadow-md text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline">Back to Dashboard</button>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-gray-600 hover:text-blue-600 transition-colors">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back
            </button>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{pitch.title}</h1>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full uppercase tracking-wider">
                                {pitch.category}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-green-600">${pitch.financials?.askAmount?.toLocaleString()}</p>
                            <p className="text-sm text-gray-500 font-medium">Asking for {pitch.financials?.equityOffered}% Equity</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <section>
                            <h3 className="text-lg font-bold text-gray-800 border-l-4 border-blue-600 pl-3 mb-3">The Problem</h3>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{pitch.content?.problem}</p>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold text-gray-800 border-l-4 border-green-600 pl-3 mb-3">The Solution</h3>
                            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{pitch.content?.solution}</p>
                        </section>
                    </div>

                    {pitch.content?.mediaUrls?.length > 0 && (
                        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {pitch.content.mediaUrls.map((url, index) => (
                                <div key={index} className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                    {url.match(/\.(mp4|mov|avi|webm)$/) ? (
                                        <video src={url} controls className="w-full h-48 object-cover" />
                                    ) : (
                                        <img src={url} alt={`Media ${index}`} className="w-full h-48 object-cover" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="bg-gray-50 px-8 py-6 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            {pitch.entrepreneurId?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{pitch.entrepreneurId?.name}</p>
                            <p className="text-xs text-gray-500">Founder</p>
                        </div>
                    </div>
                    {currentUser?._id !== (pitch.entrepreneurId?._id || pitch.entrepreneurId) && (
                        <button 
                            onClick={() => navigate(`/chat/${pitch.entrepreneurId?._id || pitch.entrepreneurId}`)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95"
                        >
                            Contact Founder
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PitchDetail;
