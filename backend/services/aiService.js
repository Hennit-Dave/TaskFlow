/**
 * AI service — integrates with an external AI API for task suggestions.
 *
 * Future implementation:
 *   1. Accept task context (title, description, tags, category).
 *   2. Call OpenAI (or similar) API with a structured prompt.
 *   3. Parse the response and return structured suggestions.
 *   4. Cache results in ai_suggestions table.
 *
 * Usage example:
 *   const aiService = require('../services/aiService');
 *   const priority = await aiService.suggestPriority(task);
 */

async function suggestPriority(task) {
  // TODO: Call AI API with task context
  return null;
}

async function suggestCategory(task) {
  // TODO: Call AI API with task context
  return null;
}

async function breakDownTask(task) {
  // TODO: Call AI API to generate subtasks
  return [];
}

module.exports = { suggestPriority, suggestCategory, breakDownTask };
