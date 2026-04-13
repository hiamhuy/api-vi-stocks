const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const tradeController = require('../controllers/trade.controller');

router.use(authMiddleware);

// POST /api/trade/place — đặt lệnh
router.post('/place', tradeController.placeTrade);

// GET /api/trade/session — thông tin phiên hiện tại
router.get('/session', tradeController.getCurrentSession);

module.exports = router;
