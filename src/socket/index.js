const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: 'https://vi-stocks.com',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── Middleware xác thực JWT cho socket ────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Không có token'));

      const decoded = jwt.verify(token, 'protrade_super_secret_key_2024');
      const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
      if (!user) return next(new Error('Người dùng không tồn tại'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Token không hợp lệ'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[Socket] Kết nối: ${user.email} (id=${user.id}, role=${user.role})`);

    // Mỗi user join room riêng để nhận thông báo cá nhân
    socket.join(`user-${user.id}`);

    // Admin join room admin
    if (user.role === 'admin') {
      socket.join('admin-room');
      console.log(`[Socket] Admin ${user.email} đã vào admin-room`);
    }

    // Phát sự kiện xác nhận kết nối
    socket.emit('connected', {
      message: `Chào ${user.email}! Đã kết nối thành công`,
      userId: user.id,
      role: user.role,
    });

    // ── Admin: đặt outcome mode qua socket ───────────
    socket.on('admin:set-outcome', async (data) => {
      if (user.role !== 'admin') {
        return socket.emit('error', { message: 'Không có quyền' });
      }
      const { setOutcomeMode } = require('../services/gameLoop.service');
      const { Session } = require('../models');
      const { getActiveSession } = require('../services/gameLoop.service');
      const { mode } = data;

      if (!['force_up', 'force_down', 'random'].includes(mode)) {
        return socket.emit('error', { message: 'Chế độ không hợp lệ' });
      }

      setOutcomeMode(mode);
      const session = getActiveSession();
      if (session) {
        await Session.update({ outcomeMode: mode }, { where: { id: session.dbId } });
      }

      io.to('admin-room').emit('admin:outcome-changed', { mode, setBy: user.email });
      console.log(`[Socket] Admin ${user.email} đặt outcome: ${mode}`);
    });

    // ── Admin: nạp tiền qua socket ────────────────────
    socket.on('admin:deposit', async (data) => {
      if (user.role !== 'admin') return;
      const { userId, amount } = data;
      try {
        const targetUser = await User.findByPk(userId);
        if (!targetUser) return socket.emit('error', { message: 'User không tồn tại' });

        targetUser.liveBalance = parseFloat(targetUser.liveBalance) + parseFloat(amount);
        await targetUser.save();

        io.to(`user-${userId}`).emit('balance:updated', {
          liveBalance: parseFloat(targetUser.liveBalance),
          message: `Admin nạp $${amount} vào tài khoản của bạn`,
        });

        socket.emit('admin:deposit-success', {
          userId,
          amount,
          newBalance: parseFloat(targetUser.liveBalance),
        });
      } catch (err) {
        socket.emit('error', { message: 'Lỗi nạp tiền' });
      }
    });

    // ── Hỗ trợ khách hàng (Support Chat) ─────────────
    socket.on('support:send-message', async (data) => {
      const { receiverId, message, imageUrl } = data;
      const { SupportMessage } = require('../models');

      try {
        if (!message && !imageUrl) return;
        if (!receiverId) return;

        // Lưu tin nhắn vào database
        const newMsg = await SupportMessage.create({
          senderId: user.id,
          receiverId: receiverId,
          message: message || null,
          imageUrl: imageUrl || null,
          isRead: false
        });

        const msgData = {
          id: newMsg.id,
          senderId: user.id,
          receiverId: receiverId,
          message: message,
          imageUrl: imageUrl,
          createdAt: newMsg.createdAt,
          sender: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            fullName: user.fullName
          }
        };

        // Gửi lại cho chính người gửi để đồng bộ tab và cập nhật UI
        socket.emit('support:message-sent', msgData);

        // Nếu user gửi, báo cho tất cả admin (admin sẽ nhận qua admin-room)
        // Nếu admin gửi cho user, user sẽ nhận qua user-{receiverId}
        if (user.role === 'user') {
          io.to('admin-room').emit('support:new-message', msgData);
        } else {
          // Admin gửi cho user
          io.to(`user-${receiverId}`).emit('support:new-message', msgData);
        }

        console.log(`[Socket] Chat: ${user.email} -> ${receiverId}: ${message}`);
      } catch (error) {
        console.error('[Socket] Support Error:', error);
        socket.emit('error', { message: 'Không thể gửi tin nhắn' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Ngắt kết nối: ${user.email}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io chưa được khởi tạo');
  return io;
};

module.exports = { initSocket, getIO };
