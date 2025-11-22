import express from 'express';
import { messages } from '../store/messagesStore.js';
import { buildGraphFromMessages } from '../graph/graphBuilder.js';
import { generateRuleBasedInsights } from '../insights/ruleBasedInsights.js';
import { polishInsightsWithLLM } from '../ai/llmClient.js';
import { buildWeeklyDigest } from '../digest/weeklyDigest.js';
import { log } from '../utils/logger.js';

const router = express.Router();

router.get('/digest/weekly', async (req, res) => {
  log('GET /digest/weekly');
  try {
    const { stats } = buildGraphFromMessages(messages);
    const ruleBased = generateRuleBasedInsights(stats);

    let aiPolished = null;
    try {
      aiPolished = await polishInsightsWithLLM(ruleBased, stats);
      log('Weekly digest AI polish', aiPolished ? 'used' : 'skipped');
    } catch (_err) {
      log('Weekly digest AI polish failure, skipped');
      aiPolished = null;
    }

    const digest = buildWeeklyDigest(stats, { ruleBased, aiPolished });
    log('Weekly digest built successfully');

    return res.json({
      status: 'ok',
      generatedAt: new Date().toISOString(),
      digest,
    });
  } catch (err) {
    log('Error building weekly digest', err?.message || err);
    return res.status(500).json({
      status: 'error',
      reason: 'Unable to build weekly digest',
    });
  }
});

export default router;
