const { SupportMessage, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Upload ảnh cho chat
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
    }

    // Trả về path để FE sử dụng
    const imageUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.id;

    const messages = await SupportMessage.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      },
      order: [['createdAt', 'ASC']],
      include: [
        { model: User, as: 'sender', attributes: ['id', 'email', 'fullName'] },
        { model: User, as: 'receiver', attributes: ['id', 'email', 'fullName'] }
      ]
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getConversations = async (req, res) => {
  try {
    // Admin only logic
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Find unique users who have exchanged messages with admins
    // This is a simplified query to get the list of users
    const [results] = await sequelize.query(`
      SELECT DISTINCT 
        CASE 
          WHEN senderId = ${req.user.id} THEN receiverId 
          ELSE senderId 
        END as userId
      FROM support_messages
      WHERE senderId = ${req.user.id} OR receiverId = ${req.user.id}
    `);

    const userIds = results.map(r => r.userId);
    
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'email', 'phone', 'fullName', 'role']
    });

    // Enhance with last message (optional but good for UI)
    const conversations = await Promise.all(users.map(async (u) => {
      const lastMsg = await SupportMessage.findOne({
        where: {
          [Op.or]: [
            { senderId: req.user.id, receiverId: u.id },
            { senderId: u.id, receiverId: req.user.id }
          ]
        },
        order: [['createdAt', 'DESC']]
      });
      return {
        user: u,
        lastMessage: lastMsg
      };
    }));

    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
