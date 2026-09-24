const express = require('express');
const multer = require('multer');
const path = require('path');
const config = require('../config');
const transferController = require('../controllers/transferController');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { transferStudentRules } = require('../validators/transferValidator');
const { idParamRule } = require('../validators/studentValidator');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(process.cwd(), config.uploadDir)),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches UI hint
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Only PDF, JPG, or PNG files are supported'));
    }
    return cb(null, true);
  },
});

router.post(
  '/',
  authenticate,
  upload.single('supportingDocument'),
  validate(transferStudentRules),
  transferController.transfer,
);
router.get('/', authenticate, transferController.listAll);
router.get('/export', authenticate, transferController.exportTransfers);
router.get('/:id/history', authenticate, validate(idParamRule), transferController.history);

module.exports = router;
