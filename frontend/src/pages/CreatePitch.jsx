import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreatePitch = () => {
    const [formData, setFormData] = useState({
        title: '',
        category: 'Technology',
        problem: '',
        solution: '',
        askAmount: '',
        equityOffered: '',
        isPrivate: false,
        tags: ''
    });
    const [media, setMedia] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const { title, category, problem, solution, askAmount, equityOffered, isPrivate, tags } = formData;

    const onChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const onFileChange = (e) => {
        setMedia(e.target.files);
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const submitData = new FormData();
        submitData.append('title', title);
        submitData.append('category', category);
        submitData.append('problem', problem);
        submitData.append('solution', solution);
        submitData.append('askAmount', askAmount);
        submitData.append('equityOffered', equityOffered);
        submitData.append('isPrivate', isPrivate);
        submitData.append('tags', tags);

        if (media) {
            for (let i = 0; i < media.length; i++) {
                submitData.append('media', media[i]);
            }
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL}/api/pitches`, submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Error creating pitch');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-indigo-600 py-6 px-8">
                    <h2 className="text-2xl font-bold text-white tracking-wide">Launch Your Pitch</h2>
                    <p className="text-indigo-100 mt-1 text-sm">Fill in the details below to attract investors on VentureHive.</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700 font-medium">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Project Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={title}
                                    onChange={onChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="E.g., Revolutionary AI Platform"
                                />
                            </div>

                            <div className="md:col-span-2 relative">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Industry Category</label>
                                <select
                                    name="category"
                                    value={category}
                                    onChange={onChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors appearance-none"
                                >
                                    <option value="Technology">Technology</option>
                                    <option value="Health">Health</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Education">Education</option>
                                    <option value="Other">Other</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-4 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tags (Comma separated)</label>
                                <input
                                    type="text"
                                    name="tags"
                                    value={tags}
                                    onChange={onChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                    placeholder="E.g., AI, SaaS, B2B"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Problem Statement</label>
                                <textarea
                                    name="problem"
                                    value={problem}
                                    onChange={onChange}
                                    required
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-y"
                                    placeholder="What problem does your venture solve?"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Proposed Solution</label>
                                <textarea
                                    name="solution"
                                    value={solution}
                                    onChange={onChange}
                                    required
                                    rows="4"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-y"
                                    placeholder="Detail your product or service offering..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Ask Amount ($)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        name="askAmount"
                                        value={askAmount}
                                        onChange={onChange}
                                        required
                                        min="0"
                                        className="w-full pl-8 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        placeholder="50000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Equity Offered (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="equityOffered"
                                        value={equityOffered}
                                        onChange={onChange}
                                        required
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="w-full pr-8 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                                        placeholder="10"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 flex items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <input
                                    type="checkbox"
                                    name="isPrivate"
                                    id="isPrivate"
                                    checked={isPrivate}
                                    onChange={onChange}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                />
                                <label htmlFor="isPrivate" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer select-none">
                                    Keep Financials Private (Only visible to authenticated Investors)
                                </label>
                            </div>

                            <div className="md:col-span-2 border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-400 transition-colors bg-gray-50">
                                <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">Upload Pitch Media</label>
                                <p className="text-xs text-gray-500 mb-4 text-center">Attach images or short video clips to make your pitch stand out.</p>
                                <div className="flex justify-center flex-col items-center">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={onFileChange}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white shadow-md ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'} transition-all`}
                            >
                                {loading ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Uploading to Cloudinary...
                                    </span>
                                ) : 'Publish Pitch'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreatePitch;
