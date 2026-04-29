import React, { useEffect, useState } from 'react';
import StatCards from '../components/StatCards';
import NewsFeed from '../components/NewsFeed';
import StockTicker from '../components/StockTicker';

const UserHome = () => {
    const [stats, setStats] = useState({});
    const [news, setNews] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingNews, setLoadingNews] = useState(true);

    // DYNAMIC URL FIX: 
    // This checks for a Vite environment variable first, then defaults to localhost:5000
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Using the dynamic base URL instead of a hardcoded one
                const res = await fetch(`${API_BASE_URL}/api/home/stats`);
                const data = await res.json();
                if (data.success) {
                    setStats(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch stats", err);
            } finally {
                setLoadingStats(false);
            }
        };

        const fetchNews = async () => {
            try {
                // Using the dynamic base URL instead of a hardcoded one
                const res = await fetch(`${API_BASE_URL}/api/home/news`);
                const data = await res.json();
                if (data.success) {
                    setNews(data.articles);
                }
            } catch (err) {
                console.error("Failed to fetch news", err);
            } finally {
                setLoadingNews(false);
            }
        };

        fetchStats();
        fetchNews();
    }, [API_BASE_URL]); // Added to dependency array to prevent warnings

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-10 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                    Welcome to <span className="text-blue-600">VentureHive</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    The premier platform connecting early-stage entrepreneurs with visionary angel investors.
                </p>
            </div>

            <StockTicker />

            <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    Platform Overview
                </h2>
                {loadingStats ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <StatCards stats={stats} />
                )}
            </div>

            <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    Latest Business News
                </h2>
                {loadingNews ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <NewsFeed articles={news} />
                )}
            </div>
        </div>
    );
};

export default UserHome;