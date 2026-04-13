const { Session } = require('../models');
const { settleSession } = require('./settlement.service');
const { getIO } = require('../socket');

// In-memory session state
const SUPPORTED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'LTCUSDT', 'ADAUSDT', 'XRPUSDT', 'MATICUSDT', 'DOGEUSDT', 'DOTUSDT'];
// Biến toàn cục để lưu interval giúp tránh ghost loops khi hot-reload
// Dùng global. để nó tồn tại xuyên suốt quá trình chạy của node process
if (!global.countdownInterval) {
  global.countdownInterval = null;
}
const activeSessions = {}; // symbol -> session

/** Lấy phiên hiện tại cho một cặp tiền */
const getActiveSession = (symbol = 'BTCUSDT') => activeSessions[symbol];

/** Admin đặt outcome mode cho một cặp tiền */
const setOutcomeMode = (symbol, mode) => {
  if (activeSessions[symbol]) {
    activeSessions[symbol].outcomeMode = mode;
    console.log(`[GameLoop] Outcome mode cho ${symbol} được đặt: ${mode}`);
  }
};

/** Tạo DB session mới + khởi tạo in-memory session cho một cặp tiền */
const createNewSession = async (symbol) => {
  const dbSession = await Session.create({
    startTime: new Date(),
    status: 'open',
    symbol,
    outcomeMode: 'random',
    totalCallAmount: 0,
    totalPutAmount: 0,
    payoutRate: (Math.random() * (0.95 - 0.8) + 0.8).toFixed(2),
  });

  activeSessions[symbol] = {
    dbId: dbSession.id,
    symbol,
    status: 'open',
    timeLeft: 60,
    outcomeMode: 'random',
    totalCallAmount: 0,
    totalPutAmount: 0,
    payoutRate: dbSession.payoutRate,
  };

  console.log(`[GameLoop] Phiên mới #${dbSession.id} cho ${symbol} bắt đầu`);
  return activeSessions[symbol];
};

/** Xác định kết quả cuối phiên */
const determineOutcome = (session) => {
  if (session.outcomeMode === 'force_up') return 'up';
  if (session.outcomeMode === 'force_down') return 'down';
  // random: 50/50
  return Math.random() > 0.5 ? 'up' : 'down';
};

/** Vòng lặp chính 60 giây */
const startGameLoop = async () => {
  if (global.countdownInterval) {
    console.log('[GameLoop] Dừng vòng lặp cũ...');
    clearInterval(global.countdownInterval);
    global.countdownInterval = null;
  }

  console.log('[GameLoop] Khởi động vòng lặp game đa cặp tiền...');

  // Tạo phiên đầu tiên cho tất cả cặp tiền
  for (const sym of SUPPORTED_SYMBOLS) {
    if (!activeSessions[sym]) {
      await createNewSession(sym);
    }
  }

  global.countdownInterval = setInterval(async () => {
    const io = getIO();
    if (!io) return;

    for (const sym of SUPPORTED_SYMBOLS) {
      const session = activeSessions[sym];
      if (!session) continue;

      session.timeLeft -= 1;

      // Pha 1: 30-60s → nhận lệnh (open)
      if (session.timeLeft === 30) {
        session.status = 'locked';
        await Session.update({ status: 'locked' }, { where: { id: session.dbId } });
        console.log(`[GameLoop] Phiên #${session.dbId} (${sym}) đã khóa lệnh`);

        io.emit('session:locked', {
          symbol: sym,
          sessionId: session.dbId,
          message: `Phiên ${sym} đã khóa — Đang chờ kết quả...`,
        });
      }

      // Phát tick đếm ngược cho tất cả client
      io.emit('session:tick', {
        symbol: sym,
        sessionId: session.dbId,
        timeLeft: session.timeLeft,
        status: session.status,
        phase: session.timeLeft > 30 ? 'open' : 'locked',
        totalCallAmount: session.totalCallAmount,
        totalPutAmount: session.totalPutAmount,
        payoutRate: session.payoutRate,
      });

      // Phát thống kê riêng cho admin
      io.to('admin-room').emit('admin:session-stats', {
        symbol: sym,
        sessionId: session.dbId,
        timeLeft: session.timeLeft,
        status: session.status,
        outcomeMode: session.outcomeMode,
        totalCallAmount: session.totalCallAmount,
        totalPutAmount: session.totalPutAmount,
      });

      // Khi đếm về 0 → thanh toán
      if (session.timeLeft <= 0) {
        const settlementSession = { ...session };
        const outcome = determineOutcome(settlementSession);

        console.log(`[GameLoop] Thanh toán phiên #${settlementSession.dbId} (${sym}) — Kết quả: ${outcome}`);

        // Xóa tạm thời khỏi active để tránh tick nhầm
        delete activeSessions[sym];

        // Thanh toán async (không block loop)
        settleSession(settlementSession, outcome).then((results) => {
          // Phát kết quả cho tất cả user
          io.emit('session:result', {
            symbol: sym,
            sessionId: settlementSession.dbId,
            outcome,           // 'up' hoặc 'down'
            outcomeMode: settlementSession.outcomeMode,
            results,           // danh sách kết quả từng lệnh
            candleColor: outcome === 'up' ? 'green' : 'red',
            message: outcome === 'up' ? `📈 ${sym} TĂNG TRƯỞNG` : `📉 ${sym} GIẢM ĐIỂM`,
          });

          // Thông báo kết quả riêng cho từng user
          for (const r of results) {
            io.to(`user-${r.userId}`).emit('trade:result', {
              symbol: sym,
              tradeId: r.tradeId,
              result: r.result,
              profit: r.profit,
              newBalance: r.newBalance,
              accountType: r.accountType,
              message:
                r.result === 'win'
                  ? `🔥 [${sym}] CHÚC MỪNG! Lợi nhuận +$${r.profit}`
                  : `💸 [${sym}] RẤT TIẾC! Kết quả -$${r.amount}`,
            });
          }

          // Tạo phiên mới sau 2 giây cho cặp tiền này
          setTimeout(async () => {
            await createNewSession(sym);
            const newSess = getActiveSession(sym);
            if (newSess) {
              io.emit('session:new', {
                symbol: sym,
                sessionId: newSess.dbId,
                timeLeft: newSess.timeLeft,
                payoutRate: newSess.payoutRate,
              });
            }
          }, 2000);
        });
      }
    }
  }, 1000);
};

/** Dừng game loop (dùng khi shutdown) */
const stopGameLoop = () => {
  if (global.countdownInterval) {
    clearInterval(global.countdownInterval);
    global.countdownInterval = null;
  }
};

module.exports = { startGameLoop, stopGameLoop, getActiveSession, setOutcomeMode, SUPPORTED_SYMBOLS };
