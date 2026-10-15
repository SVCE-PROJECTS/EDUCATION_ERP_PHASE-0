/**
 * Unified Express Application
 * Merged from Admin-erp, faculty_student, and education_erp app configurations
 */

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const compression  = require('compression');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const fs           = require('fs');

const config                    = require('./config');
const routes                    = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { logger }                = require('./utils/logger');

// ── Ensure upload directory exists ───────────────────────────────────────────
const uploadPath = path.join(process.cwd(), config.uploadDir);
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow iframe uploads
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 1000, // Increased for development
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  handler: (req, res) => {
    logger.warn(`Global rate limit reached for IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
    res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased for development
  message: { success: false, message: 'Too many login attempts. Try again after 15 minutes.' },
  handler: (req, res) => {
    logger.warn(`Auth rate limit reached for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({ success: false, message: 'Too many login attempts. Try again after 15 minutes.' });
  },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login',         authLimiter);
app.use('/api/auth/admin/login',   authLimiter);
app.use('/api/auth/faculty/login', authLimiter);
app.use('/api/hod/auth/login',     authLimiter);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ── Logging ───────────────────────────────────────────────────────────────────
if (config.env !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Static Files (uploads) ───────────────────────────────────────────────────
// Relax frame/CORP headers so the document-viewer modal works across origins
app.use('/uploads', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Content-Security-Policy');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadPath));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  environment: config.env,
  timestamp: new Date().toISOString(),
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);
app.get('/', (req, res) => res.json({
  status: 'ok',
  message: 'Unified ERP backend is running',
  timestamp: new Date().toISOString(),
}));

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
