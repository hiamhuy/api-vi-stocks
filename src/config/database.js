require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  'u353225927_vi_stocks',
  'u353225927_vi_stocks',
  '1P@fD5?og',
  {
    host: 'srv2133.hstgr.io',
    port: 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
