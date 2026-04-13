const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.get('/history/:otherUserId', authMiddleware, supportController.getHistory);
router.get('/conversations', authMiddleware, supportController.getConversations);
router.post('/upload', authMiddleware, upload.single('image'), supportController.uploadImage);

module.exports = router;
