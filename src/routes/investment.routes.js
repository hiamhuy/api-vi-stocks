const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investment.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

const upload = require('../middleware/upload.middleware');

// Public/User Routes (Requires Auth)
router.get('/projects', investmentController.getAllProjects);
router.get('/projects/:id', investmentController.getProjectById);
router.post('/invest', authMiddleware, investmentController.invest);
router.get('/my-investments', authMiddleware, investmentController.getUserInvestments);

// Admin Routes (Requires Auth + Admin)
router.post('/admin/projects', authMiddleware, adminMiddleware, investmentController.adminCreateProject);
router.put('/admin/projects/:id', authMiddleware, adminMiddleware, investmentController.adminUpdateProject);
router.delete('/admin/projects/:id', authMiddleware, adminMiddleware, investmentController.adminDeleteProject);
router.post('/admin/upload-image', authMiddleware, adminMiddleware, (req, res, next) => {
    // Force type to investment using query instead of body to avoid 'undefined' error before multer
    req.query.type = 'investment';
    next();
}, upload.single('image'), investmentController.adminUploadProjectImage);
router.get('/admin/all-investments', authMiddleware, adminMiddleware, investmentController.adminGetAllInvestments);

module.exports = router;
