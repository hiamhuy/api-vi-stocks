const { Trade, Session, User } = require('../models');

/**
 * Xử lý kết quả cho một phiên: tính thắng/thua và cộng/trừ số dư user
 * @param {object} session — in-memory session object
 * @param {string} outcome — 'up' hoặc 'down'
 */
const settleSession = async (session, outcome) => {
  try {
    // Lấy tất cả lệnh đang pending trong phiên này
    const trades = await Trade.findAll({
      where: { sessionId: session.dbId, result: 'pending' },
      include: [{ model: User, as: 'user' }],
    });

    const results = [];

    for (const trade of trades) {
      const isWin =
        (outcome === 'up' && trade.type === 'call') ||
        (outcome === 'down' && trade.type === 'put');

      const amount = parseFloat(trade.amount);
      const payoutRate = parseFloat(trade.payoutRate);
      const profit = isWin ? +(amount * payoutRate).toFixed(2) : -amount;
      const result = isWin ? 'win' : 'lose';

      // Cập nhật lệnh
      await trade.update({ result, profit });

      // Lấy user mới nhất để tránh race condition (số dư bị ghi đè nếu có nhiều lệnh)
      const user = await User.findByPk(trade.userId);
      if (!user) continue;

      // Hệ thống hiện tại chỉ dùng liveBalance, fallback an toàn nếu accountType không có
      const balanceField = (trade.accountType && user[trade.accountType + 'Balance']) 
        ? trade.accountType + 'Balance' 
        : 'liveBalance';
        
      const currentBalance = parseFloat(user[balanceField]) || 0;

      if (isWin) {
        // Trả lại tiền gốc + lợi nhuận
        user[balanceField] = +(currentBalance + amount + profit).toFixed(2);
        await user.save();
      }
      // Nếu thua: tiền đã bị trừ khi đặt lệnh, không cần trừ thêm

      const finalBalance = parseFloat(user[balanceField]);

      results.push({
        userId: user.id,
        email: user.email,
        tradeId: trade.id,
        type: trade.type,
        amount,
        result,
        profit,
        newBalance: isNaN(finalBalance) ? currentBalance : finalBalance,
        accountType: trade.accountType || 'live',
      });
    }

    // Cập nhật phiên vào DB
    await Session.update(
      { status: 'settled', outcome, endTime: new Date() },
      { where: { id: session.dbId } }
    );

    console.log(`[Settlement] Phiên #${session.dbId} kết thúc — Outcome: ${outcome} — ${trades.length} lệnh`);
    return results;
  } catch (err) {
    console.error('[settleSession]', err);
    return [];
  }
};

module.exports = { settleSession };
