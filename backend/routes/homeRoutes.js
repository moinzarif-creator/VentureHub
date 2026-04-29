const express = require('express');
const router = express.Router();
const { getPlatformStats, getMarketNews } = require('../controllers/homeController');

// @route GET /api/home/stats
// @desc Get platform statistics
// @access Public
router.get('/stats', getPlatformStats);

// @route GET /api/home/news
// @desc Get business market news
// @access Public
router.get('/news', getMarketNews);

module.exports = router;
