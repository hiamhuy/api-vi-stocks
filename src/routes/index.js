const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/user', require('./user.routes'));
router.use('/trade', require('./trade.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/support', require('./support.routes'));
router.use('/investment', require('./investment.routes'));

// Kiểm tra server
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'ProTrade API đang chạy ✅', timestamp: new Date() });
});

module.exports = router;
