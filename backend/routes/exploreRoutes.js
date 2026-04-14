const express = require('express');
const router = express.Router();
const exploreController = require('../controllers/exploreController');
const auth = require('../middleware/authMiddleware');

router.get('/matches', auth, exploreController.getMatches);

module.exports = router;
