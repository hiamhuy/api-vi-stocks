const { InvestmentProject, UserInvestment, User, sequelize } = require('../models');

/** Lấy danh sách tất cả dự án */
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await InvestmentProject.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách dự án', error: error.message });
  }
};

/** Lấy chi tiết dự án */
exports.getProjectById = async (req, res) => {
  try {
    const project = await InvestmentProject.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Không tìm thấy dự án' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy chi tiết dự án', error: error.message });
  }
};

/** Thực hiện đầu tư */
exports.invest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { projectId, amount } = req.body;
    const userId = req.user.id;

    // 1. Kiểm tra dự án
    const project = await InvestmentProject.findByPk(projectId);
    if (!project || !project.isActive) {
      return res.status(404).json({ message: 'Dự án không tồn tại hoặc đã đóng' });
    }

    // 2. Kiểm tra hạn mức
    const investAmt = parseFloat(amount);
    if (investAmt < parseFloat(project.minInvest) || investAmt > parseFloat(project.maxInvest)) {
      return res.status(400).json({
        message: `Số tiền đầu tư phải từ $${project.minInvest} đến $${project.maxInvest}`
      });
    }

    // 2.5 Kiểm tra xem người dùng đã đầu tư dự án này chưa
    const existingInvestment = await UserInvestment.findOne({
      where: { userId, projectId, status: 'active' }
    });
    if (existingInvestment) {
      return res.status(400).json({ message: 'Bạn đã đầu tư dự án này rồi, không thể đầu tư thêm cùng lúc!' });
    }

    // 3. Kiểm tra số dư user
    const user = await User.findByPk(userId);
    if (parseFloat(user.liveBalance) < investAmt) {
      return res.status(400).json({ message: 'Số dư không đủ' });
    }

    // 4. Tính toán ngày kết thúc và lợi nhuận (Lũy tiến hàng ngày)
    const startDate = new Date();
    const endDate = new Date();
    const cycleDays = project.cycleDays || 30;
    endDate.setDate(startDate.getDate() + cycleDays);
    
    // Formula for simple total profit (remains target, but compounding internally)
    const totalRoi = parseFloat(project.roiPercentage);
    const projectedProfit = (investAmt * totalRoi) / 100;

    // 5. Trừ tiền và tạo bản ghi đầu tư
    user.liveBalance = parseFloat(user.liveBalance) - investAmt;
    await user.save({ transaction: t });

    const investment = await UserInvestment.create({
      userId,
      projectId,
      amount: investAmt,
      startDate,
      endDate,
      roiPercentage: project.roiPercentage,
      projectedProfit,
      status: 'active'
    }, { transaction: t });

    await t.commit();
    res.json({
      message: 'Đầu tư thành công!',
      investment,
      newBalance: user.liveBalance
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: 'Lỗi khi thực hiện đầu tư', error: error.message });
  }
};

/** Lấy danh sách đầu tư của user hiện tại */
exports.getUserInvestments = async (req, res) => {
  try {
    const investments = await UserInvestment.findAll({
      where: { userId: req.user.id },
      include: [{ model: InvestmentProject, as: 'project' }],
      order: [['createdAt', 'DESC']]
    });

    // Tính toán lợi nhuận lũy tiến (Accumulated Profit) cho từng khoản đầu tư
    const enhancedInvestments = investments.map(inv => {
      const investment = inv.toJSON();
      const project = investment.project;
      
      // Nếu dự án đã hoàn tất, tiền lãi nhận được chính xác bằng với lãi dự kiến
      if (!project || investment.status !== 'active') {
        investment.accumulatedProfit = investment.projectedProfit;
        return investment;
      }

      const p = parseFloat(investment.amount);
      const totalRoi = parseFloat(investment.roiPercentage) / 100;
      const d = project.cycleDays || 30;

      // r is the daily compound rate such that (1+r)^d = 1 + totalRoi
      const r = Math.pow(1 + totalRoi, 1 / d) - 1;

      const start = new Date(investment.startDate);
      const now = new Date();
      // Tính chính xác số ngày lẻ (fractional days) -> Cập nhật: Trở về tính theo ngày chẵn
      const elapsedDays = Math.min(d, Math.floor((now - start) / (1000 * 60 * 60 * 24)));

      // Compounded profit at day 'elapsedDays'
      if (elapsedDays > 0) {
        const currentBalance = p * Math.pow(1 + r, elapsedDays);
        // Trả về số thực dài để frontend render mượt
        investment.accumulatedProfit = currentBalance - p;
      } else {
        investment.accumulatedProfit = 0;
      }

      return investment;
    });

    res.json(enhancedInvestments);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy lịch sử đầu tư', error: error.message });
  }
};

// --- ADMIN CONTROLLERS ---

exports.adminCreateProject = async (req, res) => {
  try {
    const project = await InvestmentProject.create(req.body);
    res.status(201).json({ message: 'Tạo dự án thành công', project });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi tạo dự án', error: error.message });
  }
};

exports.adminUpdateProject = async (req, res) => {
  try {
    const project = await InvestmentProject.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Không tìm thấy dự án' });

    await project.update(req.body);
    res.json({ message: 'Cập nhật dự án thành công', project });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật dự án', error: error.message });
  }
};

exports.adminDeleteProject = async (req, res) => {
  try {
    const project = await InvestmentProject.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Không tìm thấy dự án' });

    // Soft delete bằng cách set isActive = false
    await project.update({ isActive: false });
    res.json({ message: 'Đã ẩn dự án thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa dự án', error: error.message });
  }
};

exports.adminGetAllInvestments = async (req, res) => {
  try {
    const investments = await UserInvestment.findAll({
      include: [
        { model: InvestmentProject, as: 'project' },
        { model: User, as: 'user', attributes: ['id', 'email', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(investments);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi lấy danh sách đầu tư hệ thống', error: error.message });
  }
};

/** Admin Upload Project Image */
exports.adminUploadProjectImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn file' });
    }
    const type = req.query.type || 'investment';
    const imageUrl = `/uploads/${type}/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi upload ảnh dự án', error: error.message });
  }
};
