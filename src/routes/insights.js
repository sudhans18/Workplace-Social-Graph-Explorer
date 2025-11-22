import express from 'express';
import { messages } from '../store/messagesStore.js';
import { buildGraphFromMessages } from '../graph/graphBuilder.js';
import { generateRuleBasedInsights } from '../insights/ruleBasedInsights.js';
import { polishInsightsWithLLM } from '../ai/llmClient.js';
import { log } from '../utils/logger.js';

const router = express.Router();

router.get('/insights/latest', async (req, res) => {
  try {
    log('GET /insights/latest');

    const { stats } = buildGraphFromMessages(messages);
    const ruleBased = generateRuleBasedInsights(stats);

    let aiPolished = null;
    try {
      aiPolished = await polishInsightsWithLLM(ruleBased, stats);
      log('AI polish', aiPolished ? 'used' : 'skipped');
    } catch (_err) {
      log('AI polish failure, skipped');
      aiPolished = null;
    }

    return res.json({
      status: 'ok',
      generatedAt: new Date().toISOString(),
      stats,
      insights: {
        ruleBased,
        aiPolished: aiPolished || null,
      },
    });
  } catch (_err) {
    log('Insights generation error');
    return res.status(500).json({
      status: 'error',
      reason: 'Unexpected server error while generating insights',
    });
  }
});

export default router;
