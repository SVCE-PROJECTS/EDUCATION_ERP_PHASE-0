/**
 * Meeting Documents Controller
 * Handles file uploads and document management for meetings
 */

const pool = require('../config/db').pool;
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('../config');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), config.uploadDir, 'meeting-documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-original-name
    const timestamp = Date.now();
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${cleanName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images are allowed.'), false);
    }
  }
});

/**
 * Upload document to meeting
 * POST /api/meetings/:id/documents
 */
const uploadDocument = async (req, res) => {
  const { id } = req.params;
  const { document_type, description } = req.body;

  try {
    // Check if meeting exists and user has access
    const meetingResult = await pool.query(
      `SELECT m.*, d.department_code,
       EXISTS(SELECT 1 FROM meeting_participants mp WHERE mp.meeting_id = m.meeting_id AND mp.participant_user_id = $2) as is_participant
       FROM meetings m
       LEFT JOIN departments d ON m.department_id = d.department_id
       WHERE m.meeting_id = $1 AND m.status != 'deleted'`,
      [id, req.user.id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    // Check access: creator, participant, or admin
    const hasAccess = meeting.requester_user_id === req.user.id ||
                     meeting.is_participant ||
                     req.user.role === 'admin' ||
                     (req.user.role !== 'admin' && meeting.department_code === req.user.departmentCode);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Insert document record
    const documentQuery = `
      INSERT INTO meeting_documents (
        meeting_id, document_type, original_filename, stored_filename, file_path, file_size,
        mime_type, description, uploaded_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const file_path = `meeting-documents/${req.file.filename}`;

    const result = await pool.query(documentQuery, [
      id,
      document_type || 'attachment',
      req.file.originalname,
      req.file.filename,
      file_path,
      req.file.size,
      req.file.mimetype,
      description,
      req.user.id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    // Clean up uploaded file if database operation fails
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to clean up uploaded file:', unlinkError);
      }
    }

    logger.error('Error uploading document:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get meeting documents
 * GET /api/meetings/:id/documents
 */
const getDocuments = async (req, res) => {
  const { id } = req.params;

  try {
    // Check meeting access
    const meetingResult = await pool.query(
      `SELECT m.*, d.department_code,
       EXISTS(SELECT 1 FROM meeting_participants mp WHERE mp.meeting_id = m.meeting_id AND mp.participant_user_id = $2) as is_participant
       FROM meetings m
       LEFT JOIN departments d ON m.department_id = d.department_id
       WHERE m.meeting_id = $1 AND m.status != 'deleted'`,
      [id, req.user.id]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    // Check access
    const hasAccess = meeting.requester_user_id === req.user.id ||
                     meeting.is_participant ||
                     req.user.role === 'admin' ||
                     (req.user.role !== 'admin' && meeting.department_code === req.user.departmentCode);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get documents
    const documentsQuery = `
      SELECT
        md.*,
        f.name as uploaded_by_name,
        f.designation as uploaded_by_designation
      FROM meeting_documents md
      LEFT JOIN users u ON md.uploaded_by_user_id = u.user_id
      LEFT JOIN faculty f ON u.faculty_id = f.faculty_id
      WHERE md.meeting_id = $1
      ORDER BY md.uploaded_at DESC
    `;

    const result = await pool.query(documentsQuery, [id]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete document
 * DELETE /api/meetings/:meetingId/documents/:documentId
 */
const deleteDocument = async (req, res) => {
  const { meetingId, documentId } = req.params;

  try {
    // Get document and check permissions
    const documentResult = await pool.query(
      `SELECT md.*, m.requester_user_id as meeting_creator
       FROM meeting_documents md
       JOIN meetings m ON md.meeting_id = m.meeting_id
       WHERE md.document_id = $1 AND md.meeting_id = $2`,
      [documentId, meetingId]
    );

    if (documentResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const document = documentResult.rows[0];

    // Only uploader, meeting creator, or admin can delete
    if (document.uploaded_by_user_id !== req.user.id &&
        document.meeting_creator !== req.user.id &&
        req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Delete file from filesystem
    try {
      const filePath = path.join(process.cwd(), document.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fileError) {
      logger.warn('Failed to delete physical file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await pool.query('DELETE FROM meeting_documents WHERE document_id = $1', [documentId]);

    res.json({ success: true, message: 'Document deleted successfully' });

  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  upload: upload.single('document'),
  uploadDocument,
  getDocuments,
  deleteDocument,
};