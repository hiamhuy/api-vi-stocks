const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

// POST /api/auth/register
router.post(
  '/register',
  [
    body('phone').notEmpty().withMessage('Số điện thoại không được trống'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email không hợp lệ'),
    body('password').isLength({ min: 6 }).withMessage('Mật khẩu tối thiểu 6 ký tự'),
    body('referralCode').notEmpty().withMessage('Mã mời là bắt buộc'),
  ],
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('identifier').custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('Vui lòng nhập Email hoặc Số điện thoại');
      }
      return true;
    }),
    body('password').notEmpty().withMessage('Mật khẩu không được trống'),
  ],
  authController.login
);

// GET /api/auth/me
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
