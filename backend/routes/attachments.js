const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * All attachment endpoints are placeholders for file uploads.
 *
 * Future implementation plan:
 *   POST   /api/attachments/upload — Upload a file (multipart/form-data)
 *   GET    /api/attachments/:id    — Download/stream a file
 *   DELETE /api/attachments/:id    — Delete an attachment
 *   GET    /api/tasks/:id/attachments — List attachments for a task
 *
 * Multer middleware will be added to handle multipart uploads.
 * Files will be stored in /backend/uploads/ with UUID filenames.
 */

router.post('/upload', authenticateToken, (req, res) => {
  res.status(501).json({ error: 'File uploads are not yet implemented.' });
});

module.exports = router;
