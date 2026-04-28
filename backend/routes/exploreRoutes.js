const express = require('express');
const router = express.Router();
const exploreController = require('../controllers/exploreController');
const auth = require('../middleware/authMiddleware');

router.get('/matches', auth, exploreController.getMatches);
router.get('/search-investors', auth, exploreController.searchInvestors);
router.post('/send-pitch', auth, exploreController.sendDirectPitch);
router.get('/cooldowns/:investorId', auth, exploreController.getPitchCooldowns);

module.exports = router;
