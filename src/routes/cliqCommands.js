import express from 'express';
import { messages } from '../store/messagesStore.js';
import { buildGraphFromMessages } from '../graph/graphBuilder.js';
import { generateRuleBasedInsights } from '../insights/ruleBasedInsights.js';
import { polishInsightsWithLLM } from '../ai/llmClient.js';
import { getAppBaseUrl } from '../utils/config.js';
import { log } from '../utils/logger.js';
import { getFilteredMessages, extractUserIds } from '../admin/messageFilter.js';
import { getAdminConfig } from '../admin/configStore.js';
import { buildAnonymizationMap, anonymizeStats, anonymizeInsights } from '../admin/anonymizer.js';

const router = express.Router();

router.post('/command', async (req, res) => {
  const payload = req.body || {};
  const cmd = (payload.command || '').trim();
  const args = payload.args || '';
  const channelId = payload.channel_id || '';
  const userId = payload.user_id || '';

  log('POST /cliq/command', { command: cmd, channelId, userId, args });

  try {
    // Get filtered messages (applies retention and ignored channels)
    const filteredMessages = getFilteredMessages(messages);
    const config = getAdminConfig();
    
    // Build graph from filtered messages
    const { nodes, stats } = buildGraphFromMessages(filteredMessages);
    let anonymizedStats = stats;
    
    // Apply anonymization if enabled
    let anonMap = null;
    if (config.anonymizeUsers) {
      // Collect all unique user IDs from messages and nodes
      const userIds = extractUserIds(filteredMessages);
      nodes.forEach(node => {
        if (node.id && !userIds.includes(node.id)) {
          userIds.push(node.id);
        }
      });
      anonMap = buildAnonymizationMap(userIds);
      anonymizedStats = anonymizeStats(stats, anonMap);
    }

    if (cmd === '/socialgraph') {
      const ruleBased = generateRuleBasedInsights(anonymizedStats);

      const n = anonymizedStats.nodeCount || 0;
      const m = anonymizedStats.edgeCount || 0;
      const clusterCount = Array.isArray(anonymizedStats.clusters) ? anonymizedStats.clusters.length : 0;
      const top = Array.isArray(anonymizedStats.topConnectors) ? anonymizedStats.topConnectors.map(c => c.id) : [];
      const siloClusters = ruleBased?.meta?.possibleSilos || [];

      const topList = top.slice(0, 3).join(', ');
      const parts = [];
      parts.push(`There ${n === 1 ? 'is' : 'are'} ${n} active ${n === 1 ? 'user' : 'users'} and ${m} interaction ${m === 1 ? 'link' : 'links'}.`);
      if (topList) parts.push(`Top connectors: ${topList}.`);
      if (clusterCount > 0) parts.push(`Detected ${clusterCount} ${clusterCount === 1 ? 'cluster' : 'clusters'}.`);
      if (siloClusters.length) parts.push(`Possible silo in cluster${siloClusters.length === 1 ? '' : 's'} ${siloClusters.join(', ')}.`);

      const text = parts.join(' ');
      const link = `${getAppBaseUrl()}/visualizer`;

      return res.json({
        status: 'ok',
        message: {
          title: 'Workplace Social Graph Snapshot',
          subtitle: 'Quick view of current collaboration patterns',
          text,
          link,
        },
      });
    }

    if (cmd === '/insights') {
      let ruleBased = generateRuleBasedInsights(anonymizedStats);

      let aiPolished = null;
      try {
        aiPolished = await polishInsightsWithLLM(ruleBased, anonymizedStats);
        log('Cliq /insights AI polish', aiPolished ? 'used' : 'skipped');
      } catch (_err) {
        log('Cliq /insights AI polish failure, skipped');
      }

      let insights = {
        ruleBased,
        aiPolished: aiPolished || null,
      };

      // Apply anonymization if enabled
      if (config.anonymizeUsers && anonMap) {
        insights = anonymizeInsights(insights, anonMap);
      }

      const bullets = (insights.aiPolished?.bullets?.length ? insights.aiPolished.bullets : insights.ruleBased.summaryPoints) || [];
      const text = bullets.length ? bullets.map(b => `- ${b}`).join('\n') : 'No insights available yet.';

      return res.json({
        status: 'ok',
        message: {
          title: 'Org Health Insights',
          subtitle: 'Summary of collaboration patterns',
          text,
          bullets,
        },
      });
    }

    return res.json({
      status: 'ok',
      message: {
        text: 'Unknown command. Available commands: /socialgraph, /insights.',
      },
    });
  } catch (err) {
    log('Error handling /cliq/command', err?.message || err);
    return res.status(500).json({
      status: 'error',
      message: {
        text: "Sorry, I couldn't process that command right now. Please try again later.",
      },
    });
  }
});

export default router;
