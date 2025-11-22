import express from 'express';
import { messages } from '../store/messagesStore.js';
import { buildGraphFromMessages } from '../graph/graphBuilder.js';
import { generateRuleBasedInsights } from '../insights/ruleBasedInsights.js';
import { polishInsightsWithLLM } from '../ai/llmClient.js';
import { getAppBaseUrl } from '../utils/config.js';
import { log } from '../utils/logger.js';

const router = express.Router();

router.post('/command', async (req, res) => {
  const payload = req.body || {};
  const cmd = (payload.command || '').trim();
  const args = payload.args || '';
  const channelId = payload.channel_id || '';
  const userId = payload.user_id || '';

  log('POST /cliq/command', { command: cmd, channelId, userId, args });

  try {
    if (cmd === '/socialgraph') {
      const { stats } = buildGraphFromMessages(messages);
      const ruleBased = generateRuleBasedInsights(stats);

      const n = stats.nodeCount || 0;
      const m = stats.edgeCount || 0;
      const clusterCount = Array.isArray(stats.clusters) ? stats.clusters.length : 0;
      const top = Array.isArray(stats.topConnectors) ? stats.topConnectors.map(c => c.id) : [];
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
      const { stats } = buildGraphFromMessages(messages);
      const ruleBased = generateRuleBasedInsights(stats);

      let aiPolished = null;
      try {
        aiPolished = await polishInsightsWithLLM(ruleBased, stats);
        log('Cliq /insights AI polish', aiPolished ? 'used' : 'skipped');
      } catch (_err) {
        log('Cliq /insights AI polish failure, skipped');
      }

      const bullets = (aiPolished?.bullets?.length ? aiPolished.bullets : ruleBased.summaryPoints) || [];
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
