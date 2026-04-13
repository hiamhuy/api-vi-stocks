const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Chỉ Admin mới có quyền truy cập',
    });
  }
  next();
};

module.exports = adminMiddleware;
