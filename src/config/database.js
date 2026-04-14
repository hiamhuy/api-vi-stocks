require('dotenv').config();
const { Sequelize } = require('sequelize');

const DB_NAME = 'u353225927_vi_stocks';
const DB_USER = 'u353225927_vi_stocks';
const DB_PASS = '1P@fD5?og';
const DB_HOST = 'srv2133.hstgr.io';

const sequelize = new Sequelize(
  DB_NAME,
  DB_USER,
  DB_PASS,
  {
    host: DB_HOST,
    port: 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      acquire: 60000,
      idle: 60000,
    },
    dialectOptions: {
      connectTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    },
  }
);

module.exports = sequelize;
