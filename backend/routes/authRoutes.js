const express      = require('express');
const router       = express.Router();
const { login, getMe, updateProfile } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

router.post('/login', login);         // POST /auth/login  — public
router.get('/me',     authenticate, getMe); // GET  /auth/me     — protected
router.put('/profile', authenticate, updateProfile); // PUT /auth/profile — protected

module.exports = router;
