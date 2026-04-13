require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./src/routes');

const app = express();

// ── Middleware ────────────────────────────────────
app.use(cors({
  origin: 'https://vi-stocks.com',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cho phép truy cập ảnh từ thư mục uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ── Log requests (dev) ────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });
}

// ── Routes ────────────────────────────────────────
app.use('/api', routes);

// ── 404 ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint không tồn tại' });
});

// ── Global error handler ──────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Error]', err);
  res.status(500).json({ success: false, message: err.message || 'Lỗi server' });
});

module.exports = app;
