import express from 'express';
import { messages } from '../store/messagesStore.js';
import { buildGraphFromMessages } from '../graph/graphBuilder.js';

const router = express.Router();

router.get('/graph/latest', (req, res) => {
  const { nodes, edges, stats } = buildGraphFromMessages(messages);
  res.json({
    graph: { nodes, edges },
    stats,
  });
});

router.get('/graph/stats', (req, res) => {
  const { stats } = buildGraphFromMessages(messages);
  res.json(stats);
});

export default router;
