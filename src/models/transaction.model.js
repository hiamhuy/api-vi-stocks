const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(20, 2),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('deposit', 'withdrawal', 'bonus'),
    defaultValue: 'deposit',
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed'),
    defaultValue: 'success',
  },
}, {
  tableName: 'transactions',
  timestamps: true,
});

module.exports = Transaction;
