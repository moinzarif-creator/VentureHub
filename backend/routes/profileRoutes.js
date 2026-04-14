const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const profileController = require('../controllers/profileController');

router.get('/me', auth, profileController.getMyProfile);

router.put('/me', auth, upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
    { name: 'pitchDeck', maxCount: 1 }
]), profileController.updateMyProfile);

router.get('/public/:userId', profileController.getPublicProfile);

module.exports = router;
