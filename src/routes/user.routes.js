const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const userController = require('../controllers/user.controller');

// Tất cả route cần đăng nhập
router.use(authMiddleware);

// GET /api/user/profile
router.get('/profile', userController.getProfile);

// GET /api/user/balance
router.get('/balance', userController.getBalance);

// GET /api/user/trades
router.get('/trades', userController.getTrades);

// PATCH /api/user/onboarding (Step 1, 3, 4)
router.patch('/onboarding', userController.updateOnboarding);

// POST /api/user/kyc-upload (Step 2)
const upload = require('../config/multer');
router.post('/kyc-upload', upload.fields([
  { name: 'idFront', maxCount: 1 },
  { name: 'idBack', maxCount: 1 }
]), userController.uploadKYC);

// POST /api/user/change-password
router.post('/change-password', userController.changePassword);

// PATCH /api/user/profile
router.patch('/profile', userController.updateProfile);

// GET /api/user/transactions
router.get('/transactions', userController.getTransactions);

// POST /api/user/withdraw
router.post('/withdraw', userController.requestWithdraw);

module.exports = router;
