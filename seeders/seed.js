require('dotenv').config();
const bcrypt = require('bcryptjs');
const seedInvestments = require('./investment.seeder');
const { sequelize, User, Session, Trade } = require('../src/models');

const seed = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // Reset toàn bộ DB khi chạy seeder
    // Seed Investments
    await seedInvestments();

    console.log('\nTẤT CẢ DỮ LIỆU ĐÃ ĐƯỢC KHỞI TẠO XONG!');

    // ── Tạo Users ──────────────────────────────
    const users = await User.bulkCreate([
      {
        email: 'admin@protrade.com',
        password: 'admin123', // Để text thuần để Hook trong Model tự hash
        fullName: 'Quản Trị Viên',
        role: 'admin',
        liveBalance: 0,
      },
      {
        email: 'nguyen.van.a@gmail.com',
        password: 'user123',
        fullName: 'Nguyễn Văn A',
        role: 'user',
        liveBalance: 5000.00,
      },
      {
        email: 'tran.thi.b@gmail.com',
        password: 'user123',
        fullName: 'Trần Thị B',
        role: 'user',
        liveBalance: 1200.00,
      },
      {
        email: 'le.van.c@gmail.com',
        password: 'user123',
        fullName: 'Lê Văn C',
        role: 'user',
        liveBalance: 0.00,
      },
      {
        email: 'pham.thi.d@gmail.com',
        password: 'user123',
        fullName: 'Phạm Thị D',
        role: 'user',
        liveBalance: 2500.00,
      },
      {
        email: 'hoang.van.e@gmail.com',
        password: 'user123',
        fullName: 'Hoàng Văn E',
        role: 'user',
        liveBalance: 0.00,
      },
    ], { individualHooks: true }); // Bật hooks để hash tự động từ User model

    console.log(`Tạo ${users.length} users`);

    // ── Tạo Sessions đã thanh toán ─────────────
    const now = new Date();
    const sessions = [];
    for (let i = 10; i >= 1; i--) {
      const start = new Date(now.getTime() - i * 60000);
      const end = new Date(start.getTime() + 60000);
      const outcomes = ['up', 'down', 'up', 'down', 'up', 'up', 'down', 'up', 'down', 'up'];
      const s = await Session.create({
        startTime: start,
        endTime: end,
        status: 'settled',
        outcome: outcomes[10 - i],
        outcomeMode: 'random',
        totalCallAmount: Math.floor(Math.random() * 500) + 100,
        totalPutAmount: Math.floor(Math.random() * 500) + 100,
      });
      sessions.push(s);
    }
    console.log(`Tạo ${sessions.length} sessions`);

    // ── Tạo Trades ──────────────────────────────
    const regularUsers = users.filter(u => u.role === 'user');
    const tradeTypes = ['call', 'put'];
    const amounts = [50, 100, 200, 500];
    const tradesData = [];

    for (const session of sessions) {
      for (const user of regularUsers.slice(0, 3)) {
        const type = tradeTypes[Math.floor(Math.random() * 2)];
        const amount = amounts[Math.floor(Math.random() * amounts.length)];
        const isWin =
          (session.outcome === 'up' && type === 'call') ||
          (session.outcome === 'down' && type === 'put');
        const profit = isWin ? +(amount * 0.85).toFixed(2) : -amount;

        tradesData.push({
          userId: user.id,
          sessionId: session.id,
          type,
          amount,
          result: isWin ? 'win' : 'lose',
          profit,
          payoutRate: 0.85,
        });
      }
    }

    await Trade.bulkCreate(tradesData);
    console.log(`Tạo ${tradesData.length} trades`);

    console.log('\nSeeding hoàn tất!\n');
    console.log('Tài khoản mẫu:');
    console.log('  Admin: admin@protrade.com / admin123');
    console.log('  User:  nguyen.van.a@gmail.com / user123');
    console.log('  User:  tran.thi.b@gmail.com / user123');
    console.log('  User:  le.van.c@gmail.com / user123\n');

    process.exit(0);
  } catch (err) {
    console.error('Lỗi seeding:', err);
    process.exit(1);
  }
};

seed();
