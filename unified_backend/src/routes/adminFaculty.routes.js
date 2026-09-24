'use strict';
/**
 * Admin Faculty Routes — /api/admin/faculty
 * Cross-department, admin-only access to faculty records.
 */

const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/authenticate');
const ctrl = require('../controllers/adminFaculty.controller');
const { uploadPhoto } = require('../middleware/upload');

const router = express.Router();

router.use(authenticate, requireAdmin);

// GET  /api/admin/faculty          — paginated list (search, departmentId, status)
router.get('/',     ctrl.list);

// GET  /api/admin/faculty/:id      — single faculty by faculty_id (PK)
router.get('/:id',  ctrl.getById);

// POST /api/admin/faculty          — create faculty
router.post('/',    uploadPhoto.single('photo'), ctrl.create);

// PUT  /api/admin/faculty/:id      — update faculty
router.put('/:id',  uploadPhoto.single('photo'), ctrl.update);

// DELETE /api/admin/faculty/:id    — delete faculty
router.delete('/:id', ctrl.remove);

module.exports = router;
