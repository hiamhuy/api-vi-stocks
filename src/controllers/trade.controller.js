const { Trade, Session, User } = require('../models');
const { getActiveSession } = require('../services/gameLoop.service');
const { getIO } = require('../socket');

// ── Đặt lệnh giao dịch ───────────────────────────
const placeTrade = async (req, res) => {
  try {
    const { type, amount } = req.body;

    if (!['call', 'put'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Loại lệnh không hợp lệ (call/put)' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
    }

    // Lấy phiên hiện tại theo symbol
    const { symbol = 'BTCUSDT' } = req.body;
    const session = getActiveSession(symbol);
    if (!session) {
      return res.status(400).json({ success: false, message: `Hiện tại không có phiên giao dịch cho ${symbol}` });
    }
    if (session.status !== 'open') {
      return res.status(400).json({ success: false, message: 'Phiên đang bị khóa, không thể đặt lệnh' });
    }

    // Kiểm tra số dư (luôn dùng Live)
    const user = await User.findByPk(req.user.id);
    if (parseFloat(user.liveBalance) < parseFloat(amount)) {
      return res.status(400).json({ success: false, message: 'Số dư không đủ' });
    }

    // Trừ tiền
    user.liveBalance = parseFloat(user.liveBalance) - parseFloat(amount);
    await user.save();

    // Tạo lệnh
    const trade = await Trade.create({
      userId: req.user.id,
      sessionId: session.dbId,
      type,
      amount: parseFloat(amount),
      payoutRate: session.payoutRate,
    });

    // Cập nhật tổng cược trong phiên (in-memory)
    const currentAmount = parseFloat(amount);
    if (type === 'call') {
      session.totalCallAmount = (parseFloat(session.totalCallAmount || 0) + currentAmount);
    } else {
      session.totalPutAmount = (parseFloat(session.totalPutAmount || 0) + currentAmount);
    }

    console.log(`[Trade] Lệnh mới cho ${symbol}: ${type} $${amount}. Tổng mới: Mua $${session.totalCallAmount}, Bán $${session.totalPutAmount}`);

    // Cập nhật DB
    await Session.update(
      { totalCallAmount: session.totalCallAmount, totalPutAmount: session.totalPutAmount },
      { where: { id: session.dbId } }
    );

    // Phát sự kiện cho admin
    const io = getIO();
    const statsData = {
      symbol,
      sessionId: session.dbId,
      totalCallAmount: session.totalCallAmount,
      totalPutAmount: session.totalPutAmount,
      timeLeft: session.timeLeft,
      status: session.status,
      phase: session.timeLeft > 30 ? 'open' : 'locked',
      payoutRate: session.payoutRate,
    };

    io.to('admin-room').emit('admin:session-stats', statsData);

    // Phát cập nhật realtime cho tất cả người dùng để thấy tổng tiền MUA/BÁN thay đổi ngay lập tức
    io.emit('session:tick', statsData);

    // Phát xác nhận cho user
    io.to(`user-${req.user.id}`).emit('trade:placed', {
      tradeId: trade.id,
      type,
      amount: parseFloat(amount),
      confirmed: true,
    });

    return res.status(201).json({
      success: true,
      message: `Đặt lệnh ${type === 'call' ? 'MUA' : 'BÁN'} thành công`,
      data: {
        trade,
        newBalance: parseFloat(user.liveBalance),
        sessionTimeLeft: session.timeLeft,
      },
    });
  } catch (err) {
    console.error('[placeTrade]', err);
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// ── Lấy thông tin phiên hiện tại ─────────────────
const getCurrentSession = async (req, res) => {
  try {
    const { symbol = 'BTCUSDT' } = req.query;
    const session = getActiveSession(symbol);
    if (!session) {
      return res.json({ success: true, data: null, message: `Không có phiên ${symbol} đang chạy` });
    }

    // Lấy lệnh của user trong phiên này
    const userTrades = await Trade.findAll({
      where: { userId: req.user.id, sessionId: session.dbId },
    });

    return res.json({
      success: true,
      data: {
        sessionId: session.dbId,
        status: session.status,
        timeLeft: session.timeLeft,
        phase: session.timeLeft > 30 ? 'open' : 'locked',
        totalCallAmount: session.totalCallAmount,
        totalPutAmount: session.totalPutAmount,
        outcomeMode: session.outcomeMode,
        myTrades: userTrades,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = { placeTrade, getCurrentSession };
