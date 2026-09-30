/**
 * Unified Authentication Controller
 * Merged from Admin-erp and education_erp auth controllers
 * Supports both admin and faculty authentication
 */

const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { successResponse, errorResponse } = require('../utils/response');
const authService = require('../services/authService');

/**
 * Admin Login (Admin-erp pattern)
 * POST /api/auth/admin/login
 * Body: { username, password }
 */
const adminLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await authService.login({ username, password });

  // Set HTTP-only cookie, matching facultyLogin/login below — previously
  // only those two set it, so an admin session relied on the Bearer header
  // alone while every other login flow also got a cookie.
  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
  });

  success(res, result);
});

/**
 * Faculty Login (education_erp pattern)
 * POST /api/auth/faculty/login
 * Body: { username, password, departmentCode? }
 * departmentCode is optional — HOD portal sends it, Faculty portal omits it.
 */
const facultyLogin = async (req, res, next) => {
  try {
    const { departmentCode, username, password } = req.body;
    // Always call facultyLogin directly so the faculty table is queried
    // regardless of whether departmentCode is present.
    const result = await authService.facultyLogin({ departmentCode, username, password });

    // Set HTTP-only cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    return successResponse(res, result, 'Login successful');
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

/**
 * Universal Login - Auto-detects user type
 * POST /api/auth/login
 * Body: { username, password, departmentCode? }
 */
const login = async (req, res, next) => {
  try {
    const { departmentCode, username, password } = req.body;
    
    // If departmentCode is provided, treat as faculty login
    if (departmentCode) {
      return facultyLogin(req, res, next);
    }
    
    // Otherwise, treat as admin login
    const result = await authService.login({ username, password });
    
    // Set cookie for consistency
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });

    success(res, result);
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

/**
 * Logout
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  res.clearCookie('token');
  return successResponse(res, null, 'Logged out successfully');
};

/**
 * Get Current User Profile
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return successResponse(res, user, 'Profile fetched');
  } catch (err) {
    if (err.statusCode) return errorResponse(res, err.message, err.statusCode);
    next(err);
  }
};

module.exports = { 
  login,           // Universal login
  adminLogin,      // Explicit admin login
  facultyLogin,    // Explicit faculty login
  logout, 
  getMe 
};
