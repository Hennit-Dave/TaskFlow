const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * All AI suggestion endpoints are placeholders for AI-powered features.
 *
 * Future implementation plan:
 *   POST   /api/ai/suggest-priority   — Suggest priority based on title/description
 *   POST   /api/ai/suggest-category   — Suggest category based on content
 *   POST   /api/ai/suggest-tags       — Auto-generate tags
 *   POST   /api/ai/break-down         — Break a task into subtasks
 *   POST   /api/ai/productivity-tip   — Generate a personalized tip
 *   GET    /api/ai/daily-summary      — Generate a daily productivity summary
 *
 * Integration will call an external AI API (e.g., OpenAI) with the task
 * context and return structured suggestions. Responses are cached in the
 * ai_suggestions table to avoid redundant API calls.
 */

router.post('/suggest', authenticateToken, (req, res) => {
  res.status(501).json({ error: 'AI suggestions are not yet implemented.' });
});

module.exports = router;
