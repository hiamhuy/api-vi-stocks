const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const adminController = require('../controllers/admin.controller');

// Tất cả route admin cần xác thực + role admin
router.use(authMiddleware, adminMiddleware);

// GET /api/admin/users — danh sách user
router.get('/users', adminController.getUsers);

// POST /api/admin/deposit — nạp tiền
router.post('/deposit', adminController.deposit);

// GET /api/admin/session — stats phiên hiện tại
router.get('/session', adminController.getSessionStats);

// GET /api/admin/sessions — lịch sử phiên
router.get('/sessions', adminController.getSessionHistory);

// POST /api/admin/outcome — đặt chế độ kết quả
router.post('/outcome', adminController.setOutcome);

// KYC & User Management (Mới)
router.get('/kyc/pending', adminController.getPendingKYC);
router.patch('/kyc/approve/:id', adminController.approveKYC);
router.patch('/kyc/reject/:id', adminController.rejectKYC);
router.get('/users/:id', adminController.getUserDetail);
router.delete('/users/:id', adminController.deleteUser);
router.get('/transactions', adminController.getTransactions);

// Quản lý rút tiền
router.get('/withdrawals/pending', adminController.getPendingWithdrawals);
router.patch('/withdrawals/approve/:id', adminController.approveWithdrawal);
router.patch('/withdrawals/reject/:id', adminController.rejectWithdrawal);

module.exports = router;
