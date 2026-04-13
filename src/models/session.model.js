const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    // open: đang nhận lệnh | locked: khóa, chờ kết quả | settled: đã thanh toán
    type: DataTypes.ENUM('open', 'locked', 'settled'),
    defaultValue: 'open',
  },
  // Cặp tiền (BTCUSDT, ETHUSDT, ...)
  symbol: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'BTCUSDT',
  },
  // Kết quả thực tế của phiên
  outcome: {
    type: DataTypes.ENUM('up', 'down'),
    allowNull: true,
  },
  // Chế độ do admin đặt
  outcomeMode: {
    type: DataTypes.ENUM('force_up', 'force_down', 'random'),
    defaultValue: 'random',
  },
  // Tổng tiền cược
  totalCallAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
  },
  totalPutAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
  },
  payoutRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.85,
  },
}, {
  tableName: 'sessions',
  timestamps: true,
});

module.exports = Session;
