const sequelize = require('../config/database');
const User = require('./user.model');
const Session = require('./session.model');
const Trade = require('./trade.model');
const Transaction = require('./transaction.model');
const SupportMessage = require('./supportMessage.model');
const InvestmentProject = require('./investmentProject.model');
const UserInvestment = require('./userInvestment.model');

// Associations
User.hasMany(Trade, { foreignKey: 'userId', as: 'trades' });
Trade.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Session.hasMany(Trade, { foreignKey: 'sessionId', as: 'trades' });
Trade.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

// Support Chat Associations
User.hasMany(SupportMessage, { foreignKey: 'senderId', as: 'sentSupportMessages' });
SupportMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

User.hasMany(SupportMessage, { foreignKey: 'receiverId', as: 'receivedSupportMessages' });
SupportMessage.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

// Investment Associations
User.hasMany(UserInvestment, { foreignKey: 'userId', as: 'investments' });
UserInvestment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

InvestmentProject.hasMany(UserInvestment, { foreignKey: 'projectId' });
UserInvestment.belongsTo(InvestmentProject, { foreignKey: 'projectId', as: 'project' });

module.exports = { 
  sequelize, 
  User, 
  Session, 
  Trade, 
  Transaction, 
  SupportMessage, 
  InvestmentProject, 
  UserInvestment 
};
