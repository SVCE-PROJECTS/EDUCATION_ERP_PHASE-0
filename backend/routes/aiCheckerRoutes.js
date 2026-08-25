const express      = require('express');
const router       = express.Router();
const multer       = require('multer');
const authenticate = require('../middleware/authenticate');
const { extractText } = require('../controllers/aiCheckerController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['text/plain', 'application/pdf'];
    const name    = file.originalname.toLowerCase();
    const ok      = allowed.includes(file.mimetype) ||
                    name.endsWith('.txt') ||
                    name.endsWith('.pdf');
    if (ok) cb(null, true);
    else cb(new Error('Only .txt and .pdf files are allowed.'));
  },
});

router.use(authenticate);

// POST /aichecker/extract  — field name must be "file"
router.post('/extract', upload.single('file'), extractText);

module.exports = router;
