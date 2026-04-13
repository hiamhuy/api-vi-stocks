const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Trade = sequelize.define('Trade', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'sessions', key: 'id' },
  },
  type: {
    type: DataTypes.ENUM('call', 'put'),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  // Kết quả sau khi phiên kết thúc
  result: {
    type: DataTypes.ENUM('win', 'lose', 'pending'),
    defaultValue: 'pending',
  },
  // Lợi nhuận/lỗ (dương = thắng, âm = thua)
  profit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
  },
  // Tỉ lệ thắng (mặc định 85%)
  payoutRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.85,
  },
}, {
  tableName: 'trades',
  timestamps: true,
});

module.exports = Trade;
