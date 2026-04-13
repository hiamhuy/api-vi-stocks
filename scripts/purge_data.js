const { Session, Trade, sequelize } = require('../src/models');
const { Op } = require('sequelize');

const KEEP_COUNT = 20; // Số lượng phiên muốn giữ lại cho mỗi đồng coin

const purgeData = async () => {
  const transaction = await sequelize.transaction();
  try {
    console.log(`[Cleanup] Đang bắt đầu dọn dẹp... Giữ lại ${KEEP_COUNT} phiên gần nhất cho mỗi symbol.`);

    // 1. Lấy danh sách các Symol đang có
    const symbols = await Session.findAll({
      attributes: ['symbol'],
      group: ['symbol'],
      transaction
    });

    const keepSessionIds = [];

    for (const s of symbols) {
      const symbol = s.symbol;
      // Tìm 500 phiên gần nhất của symbol này
      const recentSessions = await Session.findAll({
        where: { symbol },
        attributes: ['id'],
        order: [['id', 'DESC']],
        limit: KEEP_COUNT,
        transaction
      });
      
      const ids = recentSessions.map(rs => rs.id);
      keepSessionIds.push(...ids);
      console.log(`[Cleanup] Symbol ${symbol}: Giữ lại ${ids.length} phiên.`);
    }

    if (keepSessionIds.length === 0) {
      console.log('[Cleanup] Không có dữ liệu để xóa.');
      await transaction.rollback();
      process.exit(0);
    }

    // 2. Xóa các Trades không thuộc danh sách giữ lại
    const deletedTrades = await Trade.destroy({
      where: {
        sessionId: { [Op.notIn]: keepSessionIds }
      },
      transaction
    });
    console.log(`[Cleanup] Đã xóa ${deletedTrades} lệnh cược cũ.`);

    // 3. Xóa các Sessions không thuộc danh sách giữ lại
    const deletedSessions = await Session.destroy({
      where: {
        id: { [Op.notIn]: keepSessionIds }
      },
      transaction
    });
    console.log(`[Cleanup] Đã xóa ${deletedSessions} phiên cũ.`);

    await transaction.commit();
    console.log('[Cleanup] Hoàn tất dọn dẹp database!');
    process.exit(0);
  } catch (err) {
    await transaction.rollback();
    console.error('[Cleanup] Lỗi trong quá trình dọn dẹp:', err);
    process.exit(1);
  }
};

purgeData();
