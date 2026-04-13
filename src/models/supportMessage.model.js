const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupportMessage = sequelize.define('SupportMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the user who sent the message (User or Admin)',
  },
  receiverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the recipient (User or Admin)',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'support_messages',
  timestamps: true,
});

module.exports = SupportMessage;
