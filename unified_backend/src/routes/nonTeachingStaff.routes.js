'use strict';
/**
 * Non-Teaching Staff Routes — /api/admin/non-teaching-staff
 */

const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/authenticate');
const ctrl = require('../controllers/nonTeachingStaff.controller');

const router = express.Router();

router.use(authenticate, requireAdmin);

// GET    /api/admin/non-teaching-staff
router.get('/',     ctrl.list);

// GET    /api/admin/non-teaching-staff/:id
router.get('/:id',  ctrl.getById);

// POST   /api/admin/non-teaching-staff
router.post('/',    ctrl.create);

// PUT    /api/admin/non-teaching-staff/:id
router.put('/:id',  ctrl.update);

// DELETE /api/admin/non-teaching-staff/:id
router.delete('/:id', ctrl.remove);

module.exports = router;
