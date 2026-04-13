const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvestmentProject = sequelize.define('InvestmentProject', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  image: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  minInvest: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 100.00,
  },
  maxInvest: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 1000000.00,
  },
  cycleDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },
  roiPercentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 10.00,
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
}, {
  tableName: 'investment_projects',
  timestamps: true,
});

module.exports = InvestmentProject;
