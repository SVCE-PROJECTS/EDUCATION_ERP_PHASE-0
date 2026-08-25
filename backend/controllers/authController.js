/**
 * authController.js
 *
 * POST /auth/login   — authenticate faculty with email + password
 * GET  /auth/me      — return authenticated faculty info from token
 */

const pool    = require('../config/db');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// ── Helper ────────────────────────────────────────────────────────
function signToken(faculty) {
  return jwt.sign(
    {
      id:          faculty.id,
      email:       faculty.email,
      name:        faculty.name,
      role:        faculty.role,
      employee_id: faculty.employee_id,
      department:  faculty.department,
      designation: faculty.designation,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /auth/login ──────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  // Basic input validation — do not reveal which field is wrong
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Look up faculty — normalise email to lowercase to avoid case mismatches
    const result = await pool.query(
      'SELECT * FROM faculty WHERE LOWER(email) = LOWER($1) AND status = $2',
      [email.trim(), 'active']
    );

    const faculty = result.rows[0];

    // Generic message — never reveal whether the email exists
    if (!faculty) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordValid = await bcrypt.compare(password, faculty.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(faculty);

    // Return token + safe user object (no password_hash)
    res.json({
      token,
      user: {
        id:          faculty.id,
        name:        faculty.name,
        email:       faculty.email,
        role:        faculty.role,
        employee_id: faculty.employee_id,
        department:  faculty.department,
        designation: faculty.designation,
        phone:       faculty.phone,
        experience:  faculty.experience,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
};

// ── GET /auth/me ──────────────────────────────────────────────────
// Returns the current user's profile based on the JWT.
// The authenticate middleware already verified the token and
// attached req.user — we just do a fresh DB lookup for accuracy.
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, employee_id, department, designation, phone, experience FROM faculty WHERE id = $1 AND status = $2',
      [req.user.id, 'active']
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Faculty account not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('getMe error:', err.message);
    res.status(500).json({ message: 'An error occurred.' });
  }
};

// ── PUT /auth/profile ─────────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await pool.query(
      'UPDATE faculty SET phone=$1, updated_at=NOW() WHERE id=$2 RETURNING id, name, email, phone, role, employee_id, department, designation, experience',
      [phone || null, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Faculty not found.' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('updateProfile error:', err.message);
    res.status(500).json({ message: 'Unable to update profile.' });
  }
};

module.exports = { login, getMe, updateProfile };
