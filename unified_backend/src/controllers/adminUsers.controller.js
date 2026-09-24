const asyncHandler = require('../utils/asyncHandler');
const { success, ApiError } = require('../utils/apiResponse');
const userRepository = require('../repositories/userRepository');
const auditRepository = require('../repositories/audit.repository');

const ASSIGNABLE_ROLES = ['admin', 'super_admin'];

const listAdminUsers = asyncHandler(async (req, res) => {
  const users = await userRepository.findAllAdmins();
  success(res, users);
});

const createAdminUser = asyncHandler(async (req, res) => {
  const {
    username, email, password, roleName = 'admin',
  } = req.body;

  if (!username || !email || !password) {
    throw new ApiError(400, 'username, email and password are required.');
  }
  if (password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters.');
  }
  if (!ASSIGNABLE_ROLES.includes(roleName)) {
    throw new ApiError(400, `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
  }

  let user;
  try {
    user = await userRepository.createAdmin({
      username, email, password, roleName,
    });
  } catch (err) {
    if (err.code === '23505') {
      throw new ApiError(409, 'A user with that username or email already exists.');
    }
    throw err;
  }

  await auditRepository.create({
    userId: req.user?.id,
    action: 'ADMIN_USER_CREATED',
    module: 'admin_user',
    recordId: String(user.id),
    newValue: { username: user.username, email: user.email, roleName },
  });

  success(res, user, null, 201);
});

const setAdminUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    throw new ApiError(400, "status must be 'active' or 'inactive'.");
  }

  if (String(req.params.id) === String(req.user?.id) && status === 'inactive') {
    throw new ApiError(400, 'You cannot deactivate your own account.');
  }

  const user = await userRepository.setStatus(req.params.id, status);
  if (!user) throw new ApiError(404, 'User not found.');

  await auditRepository.create({
    userId: req.user?.id,
    action: status === 'active' ? 'ADMIN_USER_ACTIVATED' : 'ADMIN_USER_DEACTIVATED',
    module: 'admin_user',
    recordId: String(user.id),
    newValue: { username: user.username, status },
  });

  success(res, user);
});

module.exports = { listAdminUsers, createAdminUser, setAdminUserStatus };
