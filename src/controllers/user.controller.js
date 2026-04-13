const { User, Trade, Session, Transaction } = require('../models');
const { Op } = require('sequelize');

const removeAccents = (str) => {
  if (!str) return str;
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

// ── Lấy thông tin profile ─────────────────
const getProfile = async (req, res) => {
  try {
    return res.json({ success: true, data: req.user.toSafeObject() });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Lấy số dư ────────────────────────────
const getBalance = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'liveBalance'],
    });
    return res.json({
      success: true,
      data: {
        liveBalance: parseFloat(user.liveBalance),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Lịch sử giao dịch ─────────────────────
const getTrades = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = { userId: req.user.id };

    const { count, rows } = await Trade.findAndCountAll({
      where,
      include: [{ model: Session, as: 'session', attributes: ['id', 'startTime', 'endTime', 'outcome'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      success: true,
      data: {
        trades: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (err) {
    console.error('[getTrades]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Quy trình Onboarding & KYC ──────────────

// Cập nhật thông tin từng bước (Step 1, 3, 4)
const updateOnboarding = async (req, res) => {
  try {
    const { step, data } = req.body;
    const user = await User.findByPk(req.user.id);

    if (step === 1) {
      // Step 1: Thông tin cơ bản
      await user.update({
        fullName: removeAccents(data.fullName),
        address: removeAccents(data.address),
        idNumber: data.idNumber,
        onboardingStep: 2
      });
    } else if (step === 3) {
      // Step 3: Thông tin ngân hàng (Chỉ được làm nếu KYC đã duyệt)
      if (user.kycStatus !== 'verified') {
        return res.status(403).json({ success: false, message: 'Vui lòng chờ Admin duyệt căn cước!' });
      }
      await user.update({
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        bankBranch: data.bankBranch,
        onboardingStep: 4
      });
    } else if (step === 4) {
      // Step 4: Mật khẩu giao dịch
      await user.update({
        tradingPassword: data.tradingPassword,
        onboardingStep: 5 // Hoàn tất
      });
    }

    return res.json({ success: true, message: 'Cập nhật thành công', data: user.toSafeObject() });
  } catch (err) {
    console.error('[updateOnboarding]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const uploadKYC = async (req, res) => {
  try {
    if (!req.files || !req.files['idFront'] || !req.files['idBack']) {
      return res.status(400).json({ success: false, message: 'Vui lòng tải lên cả 2 mặt căn cước!' });
    }

    const user = await User.findByPk(req.user.id);
    await user.update({
      idFrontPhoto: `/uploads/kyc/${req.files['idFront'][0].filename}`,
      idBackPhoto: `/uploads/kyc/${req.files['idBack'][0].filename}`,
      kycStatus: 'pending'
    });

    // Thông báo cho admin
    const { getIO } = require('../socket');
    getIO().to('admin-room').emit('admin:new-kyc', {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      message: `Người dùng ${user.email} vừa gửi hồ sơ xác thực mới!`
    });

    return res.json({ success: true, message: 'Đã gửi yêu cầu xác thực, vui lòng chờ duyệt!' });
  } catch (err) {
    console.error('[uploadKYC]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Đổi mật khẩu người dùng
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác' });
    }

    user.password = newPassword;
    await user.save(); // Model hooks sẽ tự hash và update rawPassword

    return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Cập nhật thông tin hồ sơ (không phụ thuộc onboarding)
const updateProfile = async (req, res) => {
  try {
    const { fullName, address, idNumber } = req.body;
    const user = await User.findByPk(req.user.id);

    await user.update({
      fullName: fullName ? removeAccents(fullName) : user.fullName,
      address: address ? removeAccents(address) : user.address,
      idNumber: idNumber || user.idNumber
    });

    return res.json({ 
      success: true, 
      message: 'Cập nhật hồ sơ thành công', 
      data: user.toSafeObject() 
    });
  } catch (err) {
    console.error('[updateProfile]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Lấy lịch sử nạp/rút của chính user
const getTransactions = async (req, res) => {
  try {
    const where = { userId: req.user.id };
    const logs = await Transaction.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('[User:getTransactions]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Yêu cầu rút tiền
const requestWithdraw = async (req, res) => {
  try {
    const { amount, tradingPassword, details } = req.body;
    const user = await User.findByPk(req.user.id);

    // 0. Kiểm tra mật khẩu giao dịch
    if (!tradingPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu giao dịch' });
    }
    if (!user.tradingPassword) {
      return res.status(400).json({ success: false, message: 'Bạn chưa thiết lập mật khẩu giao dịch. Vui lòng hoàn tất onboarding.' });
    }
    if (user.tradingPassword !== tradingPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu giao dịch không chính xác' });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
    }

    if (parseFloat(user.liveBalance) < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: 'Số dư không đủ để thực hiện giao dịch này' });
    }

    // 1. Tạo giao dịch rút tiền trạng thái pending
    const transaction = await Transaction.create({
      userId: user.id,
      amount: parseFloat(amount),
      type: 'withdrawal',
      description: details || 'Yêu cầu rút tiền',
      status: 'pending'
    });

    // 2. Trừ số dư ngay lập tức để tránh double-spending
    await user.update({
      liveBalance: parseFloat(user.liveBalance) - parseFloat(amount)
    });

    // 3. Thông báo cho Admin
    const { getIO } = require('../socket');
    const identifier = user.email || user.phone || `ID:${user.id}`;
    getIO().to('admin-room').emit('admin:new-withdrawal', {
      transactionId: transaction.id,
      userId: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      amount: amount,
      message: `Người dùng ${identifier} vừa yêu cầu rút $${amount}`
    });

    return res.json({ 
      success: true, 
      message: 'Yêu cầu rút tiền đã được gửi, vui lòng chờ duyệt!',
      data: {
        transactionId: transaction.id,
        newBalance: user.liveBalance
      }
    });
  } catch (err) {
    console.error('[requestWithdraw]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { 
  getProfile, 
  getBalance, 
  getTrades, 
  updateOnboarding, 
  uploadKYC, 
  changePassword, 
  updateProfile, 
  getTransactions,
  requestWithdraw
};

