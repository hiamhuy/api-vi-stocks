const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { Op } = require('sequelize');

// ── Đăng ký ──────────────────────────────
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, phone, password, fullName, referralCode } = req.body;
  console.log(`[Auth:Register] Đang đăng ký cho: ${phone || email} với mã mời: ${referralCode}`);
  
  // Kiểm tra Mã Mời
  const inviter = await User.findOne({ where: { referralCode: referralCode } });
  if (!inviter) {
    return res.status(400).json({ success: false, message: 'Mã mời không chính xác hoặc không tồn tại' });
  }

  try {
    const where = {};
    if (email) where.email = email;
    if (phone) where.phone = phone;

    if (Object.keys(where).length === 0) {
      return res.status(400).json({ success: false, message: 'Thiếu email hoặc số điện thoại' });
    }

    const existing = await User.findOne({ where: { [Op.or]: where } });
    if (existing) {
      console.log(`[Auth:Register] ❌ Thất bại: Email/Phone đã tồn tại`);
      return res.status(409).json({ success: false, message: 'Email hoặc số điện thoại đã được sử dụng' });
    }

    const user = await User.create({ 
      email, 
      phone, 
      password, 
      fullName, 
      rawPassword: password,
      referredBy: inviter.id
    });
    console.log(`[Auth:Register] ✅ Thành công: Đã tạo user ID ${user.id}`);
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: { token, user: user.toSafeObject() },
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Đăng nhập ─────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, phone, password } = req.body;
  const identifier = phone || email;
  console.log(`[Auth:Login] 🔑 Đang kiểm tra đăng nhập cho identifier: ${identifier}`);

  try {
    const where = {};
    if (email) where.email = email;
    if (phone) where.phone = phone;

    if (Object.keys(where).length === 0) {
      return res.status(400).json({ success: false, message: 'Thiếu email hoặc số điện thoại' });
    }

    const user = await User.findOne({ where: { [Op.or]: where } });
    if (!user) {
      console.log(`[Auth:Login] ❌ Thất bại: Không tìm thấy user: ${identifier}`);
      return res.status(401).json({ success: false, message: 'Thông tin đăng nhập không đúng' });
    }

    if (!user.isActive) {
      console.log(`[Auth:Login] ❌ Thất bại: Tài khoản ${email} đang bị khóa`);
      return res.status(401).json({ success: false, message: 'Tài khoản đang bị khóa' });
    }

    const valid = await user.comparePassword(password);
    console.log(`[Auth:Login] Kết quả so sánh mật khẩu cho ${email}: ${valid ? '✅ Khớp' : '❌ SAI'}`);

    if (!valid) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    console.log(`[Auth:Login] ✅ Thành công: User ID ${user.id} đã đăng nhập`);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: { token, user: user.toSafeObject() },
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Lấy thông tin người dùng hiện tại ─────
const getMe = async (req, res) => {
  try {
    return res.json({ success: true, data: req.user.toSafeObject() });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { register, login, getMe };
