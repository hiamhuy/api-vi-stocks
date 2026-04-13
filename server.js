require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./src/socket');
const { sequelize } = require('./src/models');
const { startGameLoop } = require('./src/services/gameLoop.service');
const { startInvestmentSettlementLoop } = require('./src/services/investmentSettlement.service');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Khởi tạo Socket.io
initSocket(server);

// Kết nối database và khởi động server
const start = async () => {
  try {
    // Kết nối MySQL
    await sequelize.authenticate();
    console.log('Kết nối MySQL thành công');

    // Đồng bộ models (tạo bảng nếu chưa có)
    // Chế độ alter: true đã bị vô hiệu hóa vì gây lỗi trùng lặp Index (ER_TOO_MANY_KEYS)
    await sequelize.sync();
    console.log('Đồng bộ database thành công');

    // Khởi động HTTP server
    server.listen(PORT, () => {
      console.log(`\nProTrade Server đang chạy tại http://localhost:${PORT}`);
      console.log(`WebSocket sẵn sàng`);
      console.log(`Môi trường: ${process.env.NODE_ENV}\n`);
    });

    // Khởi động vòng lặp game (sau 1 giây để DB sync xong)
    setTimeout(() => {
      startGameLoop();
      startInvestmentSettlementLoop();
    }, 1000);
  } catch (err) {
    console.error('Lỗi khởi động:', err);
    process.exit(1);
  }
};

// Xử lý tắt server gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('\nDừng server...');
  server.close(() => process.exit(0));
});

start();
