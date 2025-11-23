import express from 'express';
import { messages } from '../store/messagesStore.js';
import { buildGraphFromMessages } from '../graph/graphBuilder.js';
import { generateRuleBasedInsights } from '../insights/ruleBasedInsights.js';
import { polishInsightsWithLLM } from '../ai/llmClient.js';
import { log } from '../utils/logger.js';
import { getFilteredMessages, extractUserIds } from '../admin/messageFilter.js';
import { getAdminConfig } from '../admin/configStore.js';
import { buildAnonymizationMap, anonymizeStats, anonymizeInsights } from '../admin/anonymizer.js';

const router = express.Router();

router.get('/insights/latest', async (req, res) => {
  try {
    log('GET /insights/latest');

    // Get filtered messages (applies retention and ignored channels)
    const filteredMessages = getFilteredMessages(messages);
    
    // Build graph from filtered messages
    const { nodes, stats } = buildGraphFromMessages(filteredMessages);
    const ruleBased = generateRuleBasedInsights(stats);

    let aiPolished = null;
    try {
      aiPolished = await polishInsightsWithLLM(ruleBased, stats);
      log('AI polish', aiPolished ? 'used' : 'skipped');
    } catch (_err) {
      log('AI polish failure, skipped');
      aiPolished = null;
    }

    let anonymizedStats = stats;
    let insights = {
      ruleBased,
      aiPolished: aiPolished || null,
      orgHealthScore: stats?.orgHealth?.score ?? null,
      orgHealthComponents: stats?.orgHealth?.components ?? null,
    };

    // Apply anonymization if enabled
    const config = getAdminConfig();
    if (config.anonymizeUsers) {
      // Collect all unique user IDs from messages and nodes
      const userIds = extractUserIds(filteredMessages);
      nodes.forEach(node => {
        if (node.id && !userIds.includes(node.id)) {
          userIds.push(node.id);
        }
      });
      const anonMap = buildAnonymizationMap(userIds);
      anonymizedStats = anonymizeStats(stats, anonMap);
      insights = anonymizeInsights(insights, anonMap);
    }

    return res.json({
      status: 'ok',
      generatedAt: new Date().toISOString(),
      stats: anonymizedStats,
      insights,
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
