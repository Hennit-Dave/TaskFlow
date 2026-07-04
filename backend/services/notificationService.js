/**
 * Notification service — dispatches notifications via WebSocket and persists them.
 *
 * Future implementation:
 *   1. Insert a row into the notifications table.
 *   2. Emit a socket.io event to the target user's room.
 *   3. Support types: task_assigned, task_completed, team_invite, mention, due_date_reminder
 *
 * Usage example:
 *   const notify = require('../services/notificationService');
 *   notify.taskAssigned(assignment);
 */

function notify(userId, type, title, body, data) {
  // TODO: Insert into notifications table
  // TODO: Emit socket.io event to user's room
  console.log(`[Notification] User ${userId}: ${title}`);
}

module.exports = { notify };
