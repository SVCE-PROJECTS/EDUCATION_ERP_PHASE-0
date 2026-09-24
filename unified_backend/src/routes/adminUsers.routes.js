const express = require('express');
const adminUsersController = require('../controllers/adminUsers.controller');
const { authenticate, requireAdmin } = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', adminUsersController.listAdminUsers);
router.post('/', adminUsersController.createAdminUser);
router.patch('/:id/status', adminUsersController.setAdminUserStatus);

module.exports = router;
