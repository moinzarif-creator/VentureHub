const User = require('../models/User');
const Pitch = require('../models/Pitch');
const Bid = require('../models/Bid');

exports.getPlatformStats = async (req, res) => {
    try {
        const investorsCount = await User.countDocuments({ role: 'Investor' });
        const entrepreneursCount = await User.countDocuments({ role: 'Entrepreneur' });
        const pitchesCount = await Pitch.countDocuments({});

        // Count active and closed bids
        const activeBids = await Bid.countDocuments({ status: { $in: ['Pending', 'Countered'] } });
        const closedBids = await Bid.countDocuments({ status: { $in: ['Accepted', 'Rejected'] } });
        const totalBids = await Bid.countDocuments({});

        res.status(200).json({
            success: true,
            data: {
                investors: investorsCount,
                entrepreneurs: entrepreneursCount,
                pitches: pitchesCount,
                totalBids: totalBids,
                activeBids: activeBids,
                closedBids: closedBids
            }
        });
    } catch (error) {
        console.error('Error fetching platform stats:', error);
        res.status(500).json({ success: false, message: 'Server error fetching stats' });
    }
};

exports.getMarketNews = async (req, res) => {
    try {
        const apiKey = process.env.NEWS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'News API Key not configured' });
        }

        // Fetch top business news
        const url = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=6&apiKey=${apiKey}`;

        // --- ADD THE HEADERS HERE ---
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'VentureHive-App/1.0',
                'Accept': 'application/json'
            }
        });
        // ----------------------------

        if (!response.ok) {
            throw new Error(`NewsAPI responded with status: ${response.status}`);
        }

        const data = await response.json();

        res.status(200).json({
            success: true,
            articles: data.articles || []
        });
    } catch (error) {
        console.error('Error fetching market news:', error);
        res.status(500).json({ success: false, message: 'Server error fetching news' });
    }
};
