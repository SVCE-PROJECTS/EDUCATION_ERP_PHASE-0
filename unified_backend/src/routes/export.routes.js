const express = require('express');
const exportController = require('../controllers/exportController');

const router = express.Router();

// :entity is one of 'students' | 'faculty' | 'non-teaching-staff'
router.get('/:entity/preview', exportController.preview);
router.post('/:entity', exportController.exportData);

module.exports = router;
