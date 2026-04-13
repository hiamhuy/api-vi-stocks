const { User } = require('../src/models');
const crypto = require('crypto');

const generateCodes = async () => {
  try {
    const users = await User.findAll({ where: { referralCode: null } });
    console.log(`[Migration] Tìm thấy ${users.length} người dùng chưa có mã mời.`);

    for (const user of users) {
      user.referralCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      await user.save();
      console.log(`[Migration] Đã tạo mã ${user.referralCode} cho ${user.email || user.phone}`);
    }

    console.log('[Migration] Hoàn tất!');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Lỗi:', err);
    process.exit(1);
  }
};

generateCodes();
