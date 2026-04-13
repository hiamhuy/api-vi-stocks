const { UserInvestment, User, InvestmentProject, Transaction, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Kiểm tra và xử lý các khoản đầu tư đã đến hạn (settlement)
 */
const settleMaturedInvestments = async () => {
  console.log('[InvestmentSettlement] Kiểm tra các khoản đầu tư đến hạn...');
  
  try {
    // 1. Tìm các đầu tư đang active đã quá hạn
    const maturedInvestments = await UserInvestment.findAll({
      where: {
        status: 'active',
        endDate: {
          [Op.lte]: new Date()
        }
      },
      include: [
        { model: User, as: 'user' },
        { model: InvestmentProject, as: 'project' }
      ]
    });

    if (maturedInvestments.length === 0) {
      console.log('[InvestmentSettlement] Không có khoản đầu tư nào cần thanh toán.');
      return;
    }

    console.log(`[InvestmentSettlement] Phát hiện ${maturedInvestments.length} khoản đầu tư đến hạn.`);

    for (const inv of maturedInvestments) {
      const t = await sequelize.transaction();
      try {
        const totalPayout = parseFloat(inv.amount) + parseFloat(inv.projectedProfit);
        const user = inv.user;

        // Cập nhật trạng thái đầu tư
        inv.status = 'completed';
        await inv.save({ transaction: t });

        // Cộng tiền cho user
        user.liveBalance = parseFloat(user.liveBalance) + totalPayout;
        await user.save({ transaction: t });

        // Ghi log giao dịch
        await Transaction.create({
          userId: user.id,
          amount: totalPayout,
          type: 'bonus', // Có thể coi đây là tiền thưởng/lãi đầu tư
          description: `Thanh toán đầu tư dự án: ${inv.project ? inv.project.name : 'Unknown'} (#${inv.id})`,
          status: 'success'
        }, { transaction: t });

        await t.commit();
        console.log(`[InvestmentSettlement] Đã thanh toán $${totalPayout} cho User #${user.id} (Đầu tư #${inv.id})`);
      } catch (err) {
        await t.rollback();
        console.error(`[InvestmentSettlement] Lỗi thanh toán đầu tư #${inv.id}:`, err);
      }
    }
  } catch (error) {
    console.error('[InvestmentSettlement] Critical Error:', error);
  }
};

/**
 * Khởi động vòng lặp kiểm tra (ví dụ 1 phút 1 lần)
 */
let settlementInterval = null;
const startInvestmentSettlementLoop = () => {
  console.log('[InvestmentSettlement] Khởi động vòng lặp thanh toán đầu tư (60s)...');
  // Chạy ngay lần đầu
  settleMaturedInvestments();
  
  settlementInterval = setInterval(settleMaturedInvestments, 60000);
};

const stopInvestmentSettlementLoop = () => {
  if (settlementInterval) {
    clearInterval(settlementInterval);
    settlementInterval = null;
  }
};

module.exports = { startInvestmentSettlementLoop, stopInvestmentSettlementLoop };
