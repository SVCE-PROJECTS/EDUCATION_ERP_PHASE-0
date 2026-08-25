const pdfParse = require('pdf-parse');
const fs = require('fs');

/**
 * POST /aichecker/extract
 * Accepts a single file (field name: "file") via multipart/form-data.
 * Returns { text: "..." }
 * Supports: .txt, .pdf
 */
const extractText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    const { originalname, mimetype, buffer } = req.file;
    const nameLower = originalname.toLowerCase();

    // ── TXT ──────────────────────────────────────────────────────────
    if (
      mimetype === 'text/plain' ||
      nameLower.endsWith('.txt')
    ) {
      const text = buffer.toString('utf8');
      return res.json({ text, filename: originalname });
    }

    // ── PDF ──────────────────────────────────────────────────────────
    if (
      mimetype === 'application/pdf' ||
      nameLower.endsWith('.pdf')
    ) {
      const data = await pdfParse(buffer);
      return res.json({ text: data.text, filename: originalname });
    }

    return res.status(400).json({
      message: `Unsupported file type: ${mimetype}. Please upload a .txt or .pdf file.`,
    });

  } catch (err) {
    console.error('AI Checker extract error:', err.message);
    res.status(500).json({ message: 'Text extraction failed: ' + err.message });
  }
};

module.exports = { extractText };
