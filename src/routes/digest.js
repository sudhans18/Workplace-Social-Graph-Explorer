import express from 'express';
import { messages } from '../store/messagesStore.js';
import { buildGraphFromMessages } from '../graph/graphBuilder.js';
import { generateRuleBasedInsights } from '../insights/ruleBasedInsights.js';
import { polishInsightsWithLLM } from '../ai/llmClient.js';
import { buildWeeklyDigest } from '../digest/weeklyDigest.js';
import { log } from '../utils/logger.js';
import { getFilteredMessages, extractUserIds } from '../admin/messageFilter.js';
import { getAdminConfig } from '../admin/configStore.js';
import { buildAnonymizationMap, anonymizeDigest } from '../admin/anonymizer.js';

const router = express.Router();

router.get('/digest/weekly', async (req, res) => {
  log('GET /digest/weekly');
  try {
    // Get filtered messages (applies retention and ignored channels)
    const filteredMessages = getFilteredMessages(messages);
    
    // Build graph from filtered messages
    const { stats } = buildGraphFromMessages(filteredMessages);
    const ruleBased = generateRuleBasedInsights(stats);

    let aiPolished = null;
    try {
      aiPolished = await polishInsightsWithLLM(ruleBased, stats);
      log('Weekly digest AI polish', aiPolished ? 'used' : 'skipped');
    } catch (_err) {
      log('Weekly digest AI polish failure, skipped');
      aiPolished = null;
    }

    let digest = buildWeeklyDigest(stats, { ruleBased, aiPolished });

    // Apply anonymization if enabled
    const config = getAdminConfig();
    if (config.anonymizeUsers) {
      const userIds = extractUserIds(filteredMessages);
      const anonMap = buildAnonymizationMap(userIds);
      digest = anonymizeDigest(digest, anonMap);
    }

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
