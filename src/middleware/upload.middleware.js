const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Function to ensure directory exists
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Determine subfolder: default to 'chat', but check if 'type' is provided in body or query
        const type = req.query.type || req.body.type || 'chat';
        const uploadDir = path.join(__dirname, '../../public/uploads', type);
        ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const type = req.query.type || req.body.type || 'chat';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, type + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận định dạng ảnh và video (JPG, PNG, MP4, v.v.)'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
});

module.exports = upload;
