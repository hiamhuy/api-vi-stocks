const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: { isEmail: true },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  fullName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
  },
  // --- KYC & Onboarding Fields ---
  idNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  idFrontPhoto: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  idBackPhoto: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  kycStatus: {
    type: DataTypes.ENUM('unverified', 'pending', 'verified', 'rejected'),
    defaultValue: 'unverified',
  },
  // Financial
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  bankAccount: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  bankBranch: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tradingPassword: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  // To show plain password to admin (as requested)
  rawPassword: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  onboardingStep: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // 1: Info, 2: Upload, 3: Bank, 4: Trading Pass, 5: Completed
  },
  // --- End KYC Fields ---
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  liveBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
  },
  referralCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
  },
  referredBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeValidate: async (user) => {
      if (!user.referralCode) {
        const { crypto } = require('crypto');
        user.referralCode = require('crypto').randomBytes(3).toString('hex').toUpperCase();
      }
    },
    beforeCreate: async (user) => {
      if (user.password) {
        // Sync rawPassword if not set manually
        if (!user.rawPassword) user.rawPassword = user.password;
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.rawPassword = user.password;
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

User.prototype.comparePassword = async function (password) {
  console.log(`[Model:User] 🛡️ So sánh mật khẩu...`);
  // console.log(`[Debug] Input password: ${password}`);
  // console.log(`[Debug] Stored hash: ${this.password}`);
  return bcrypt.compare(password, this.password);
};

User.prototype.toSafeObject = function () {
  const { password, ...safe } = this.toJSON();
  return safe;
};

module.exports = User;
