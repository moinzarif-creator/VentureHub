const User = require('../models/User');
const Pitch = require('../models/Pitch');
const Bid = require('../models/Bid');

// --- CACHE VARIABLES ---
// We store the news here so we don't have to keep asking NewsAPI
let cachedNews = [];
let lastFetchTime = 0;

exports.getPlatformStats = async (req, res) => {
    try {
        const investorsCount = await User.countDocuments({ role: 'Investor' });
        const entrepreneursCount = await User.countDocuments({ role: 'Entrepreneur' });
        const pitchesCount = await Pitch.countDocuments({});

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
        const currentTime = Date.now();
        const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

        // 1. Check cache first
        if (cachedNews.length > 0 && (currentTime - lastFetchTime < fifteenMinutes)) {
            return res.status(200).json({ success: true, articles: cachedNews });
        }

        // 2. Get API Key
        const apiKey = process.env.NEWS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'News API Key not configured' });
        }

        // 3. NEW GNEWS URL (Notice it uses 'max=6' instead of 'pageSize=6')
        const url = `https://gnews.io/api/v4/top-headlines?category=business&lang=en&max=6&apikey=${apiKey}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Connection': 'close'
                // Notice we removed the massive Chrome spoofing header! 
                // GNews doesn't block Node.js, so we don't need to wear a disguise anymore.
            }
        });

        if (!response.ok) {
            throw new Error(`GNews responded with status: ${response.status}`);
        }

        const data = await response.json();

        // 4. Translate GNews format to match what React expects from NewsAPI
        const formattedArticles = (data.articles || []).map(article => ({
            ...article,
            urlToImage: article.image // React looks for urlToImage, GNews provides 'image'
        }));

        // 5. Save to cache
        cachedNews = formattedArticles;
        lastFetchTime = currentTime;

        res.status(200).json({
            success: true,
            articles: cachedNews
        });
    } catch (error) {
        console.error('Error fetching market news:', error.message);

        res.status(200).json({
            success: true,
            articles: cachedNews || []
        });
    }
};