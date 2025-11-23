import express from 'express';
import { messages } from '../store/messagesStore.js';
import { buildGraphFromMessages } from '../graph/graphBuilder.js';
import { getFilteredMessages, extractUserIds } from '../admin/messageFilter.js';
import { getAdminConfig } from '../admin/configStore.js';
import { buildAnonymizationMap, anonymizeGraph, anonymizeStats } from '../admin/anonymizer.js';

const router = express.Router();

router.get('/graph/latest', (req, res) => {
  // Get filtered messages (applies retention and ignored channels)
  const filteredMessages = getFilteredMessages(messages);
  
  // Build graph from filtered messages
  const { nodes, edges, stats } = buildGraphFromMessages(filteredMessages);
  
  let graph = { nodes, edges };
  let anonymizedStats = stats;
  
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
    graph = anonymizeGraph(graph, anonMap);
    anonymizedStats = anonymizeStats(stats, anonMap);
  }
  
  res.json({
    graph,
    stats: anonymizedStats,
  });
});

router.get('/graph/stats', (req, res) => {
  // Get filtered messages (applies retention and ignored channels)
  const filteredMessages = getFilteredMessages(messages);
  
  // Build graph from filtered messages
  const { nodes, stats } = buildGraphFromMessages(filteredMessages);
  
  let anonymizedStats = stats;
  
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
  }
  
  res.json(anonymizedStats);
});

export default router;
