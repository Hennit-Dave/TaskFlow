const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * All team endpoints are placeholders for future collaboration features.
 *
 * Future implementation plan:
 *   GET    /api/teams          — List teams the user belongs to
 *   POST   /api/teams          — Create a new team
 *   GET    /api/teams/:id      — Team details with members
 *   PUT    /api/teams/:id      — Update team settings
 *   DELETE /api/teams/:id      — Delete a team
 *   POST   /api/teams/:id/members — Invite/add a member
 *   DELETE /api/teams/:id/members/:userId — Remove a member
 */

router.get('/', authenticateToken, (req, res) => {
  res.json({ teams: [], message: 'Team collaboration will be available in a future update.' });
});

router.post('/', authenticateToken, (req, res) => {
  res.status(501).json({ error: 'Team creation is not yet implemented.' });
});

module.exports = router;
