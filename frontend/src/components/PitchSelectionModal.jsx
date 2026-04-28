import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';

const PitchSelectionModal = ({ investorId, investorName, onClose, onPitchSent }) => {
    const toast = useToast();
    const [pitches, setPitches] = useState([]);
    const [cooldowns, setCooldowns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingPitchId, setSendingPitchId] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [pitchesRes, cooldownsRes] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/api/pitches/mine`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    axios.get(`${import.meta.env.VITE_API_URL}/api/explore/cooldowns/${investorId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);
                setPitches(pitchesRes.data);
                setCooldowns(cooldownsRes.data);
            } catch (err) {
                console.error('Error fetching modal data', err);
                setError('Failed to load pitches. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [investorId]);

    const handleSend = async (pitchId) => {
        setSendingPitchId(pitchId);
        try {
            const token = localStorage.getItem('token');
            console.log(`[Modal] Sending pitch ${pitchId} to investor ${investorId}`);
            
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/explore/send-pitch`, 
                { investorId, pitchId },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            console.log('[Modal] Pitch sent successfully:', response.data);
            onPitchSent(pitchId);
            onClose();
        } catch (err) {
            console.error('[Modal] Failed to send pitch:', err.response?.data || err.message);
            toast.error(err.response?.data?.message || 'Failed to send pitch. Please try again.');
        } finally {
            setSendingPitchId(null);
        }
    };

    const getCooldownInfo = (pitchId) => {
        const cooldown = cooldowns.find(c => c.pitchId === pitchId);
        if (!cooldown) return null;
        
        const daysLeft = Math.ceil((new Date(cooldown.availableAt) - new Date()) / (24 * 60 * 60 * 1000));
        return daysLeft > 0 ? daysLeft : null;
    };

    if (!investorId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Select Pitch</h2>
                        <p className="text-blue-100 text-sm">Send your best work to {investorName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-10 text-red-500">{error}</div>
                    ) : pitches.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <p className="mb-4">You haven't created any pitches yet.</p>
                            <button 
                                onClick={() => { window.location.href = '/create-pitch'; }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold"
                            >
                                Create Your First Pitch
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pitches.map(pitch => {
                                const daysLeft = getCooldownInfo(pitch._id);
                                const isLocked = daysLeft !== null;

                                return (
                                    <div key={pitch._id} className={`p-4 rounded-2xl border-2 transition-all flex justify-between items-center ${isLocked ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-blue-50 hover:border-blue-200 hover:shadow-md'}`}>
                                        <div className="flex-1 min-w-0 mr-4">
                                            <h3 className="font-bold text-gray-900 truncate">{pitch.title}</h3>
                                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{pitch.category}</p>
                                            {isLocked && (
                                                <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                                    Available in {daysLeft} days
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleSend(pitch._id)}
                                            disabled={isLocked || sendingPitchId === pitch._id}
                                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-sm
                                                ${isLocked 
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                                    : sendingPitchId === pitch._id
                                                        ? 'bg-blue-400 text-white cursor-wait'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-blue-200'
                                                }
                                            `}
                                        >
                                            {sendingPitchId === pitch._id ? 'Sending...' : 'Send Pitch'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PitchSelectionModal;
