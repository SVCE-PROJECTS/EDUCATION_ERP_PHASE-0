/**
 * Unified File Upload Middleware
 * From education_erp upload middleware
 * Uses multer for handling multipart/form-data file uploads
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Upload directories
const uploadDirs = {
  photos: path.join(__dirname, '..', '..', config.uploadDir, 'photos'),
  documents: path.join(__dirname, '..', '..', config.uploadDir, 'documents'),
  exports: path.join(__dirname, '..', '..', config.uploadDir, 'exports'),
};

// Ensure upload directories exist
Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Storage configuration for photos
 */
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirs.photos),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `photo_${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

/**
 * Storage configuration for documents
 */
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirs.documents),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `doc_${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

/**
 * File filter for photos (images only)
 */
const photoFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, JPEG, PNG, WebP, and GIF images are allowed'), false);
  }
};

/**
 * File filter for documents
 */
const documentFilter = (req, file, cb) => {
  // Includes jpg/jpeg/png — faculty document uploads (ID proof, certificates,
  // scanned records) are commonly photos/scans, not just office documents.
  const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, and PNG files are allowed'), false);
  }
};

/**
 * Photo upload middleware
 * Accepts image files up to 5MB
 */
const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: photoFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_PHOTO_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
});

/**
 * Document upload middleware
 * Accepts document files up to 10MB
 */
const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_DOCUMENT_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
});

/**
 * Generic upload middleware (any file type)
 * Use with caution - allows any file type
 */
const uploadAny = multer({
  storage: documentStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
});

/**
 * Delete uploaded file
 * Helper function to delete files from uploads directory
 * 
 * @param {string} filepath - Relative path to file (e.g., 'photos/photo_123.jpg')
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
const deleteUploadedFile = async (filepath) => {
  try {
    const fullPath = path.join(__dirname, '..', '..', config.uploadDir, filepath);
    
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Get upload URL
 * Convert file path to accessible URL
 * 
 * @param {string} filepath - Relative path to file
 * @returns {string} Full URL to file
 */
const getUploadUrl = (filepath) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
  return `${baseUrl}/uploads/${filepath}`;
};

module.exports = {
  uploadPhoto,
  uploadDocument,
  uploadAny,
  deleteUploadedFile,
  getUploadUrl,
  uploadDirs,
};
