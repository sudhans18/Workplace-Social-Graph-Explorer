import {
  createUndirectedAdjacency,
  computeDegreeMetrics,
  computeBetweennessCentrality,
} from './metrics.js';
import { detectCommunities } from './clustering.js';
import { computeOrgHealthScore } from '../insights/orgHealthScore.js';
import { log } from '../utils/logger.js';

function summarizeClusters(clusterAssignments) {
  const summaryMap = new Map();

  clusterAssignments.forEach((clusterId, nodeId) => {
    if (!summaryMap.has(clusterId)) {
      summaryMap.set(clusterId, []);
    }
    summaryMap.get(clusterId).push(nodeId);
  });

  return Array.from(summaryMap.entries()).map(([clusterId, nodes]) => ({
    clusterId,
    size: nodes.length,
    nodes: nodes.sort(),
  }));
}

function buildEdgeList(edgeWeights) {
  return Array.from(edgeWeights.entries()).map(([key, weight]) => {
    const [from, to] = key.split('|');
    return { from, to, weight };
  });
}

export function buildGraphFromMessages(messages) {
  const nodeIds = new Set();
  const edgeWeights = new Map();
  const messageSenderById = new Map();

  for (const msg of messages) {
    if (!msg || !msg.message_id) continue;
    messageSenderById.set(msg.message_id, msg.sender_id);
  }

  const incrementEdge = (from, to, amount) => {
    if (!from || !to) return;
    const key = `${from}|${to}`;
    const current = edgeWeights.get(key) || 0;
    edgeWeights.set(key, current + amount);
    nodeIds.add(from);
    nodeIds.add(to);
  };

  for (const msg of messages) {
    if (!msg) continue;
    const sender = msg.sender_id;
    const mentions = Array.isArray(msg.mentions) ? msg.mentions : [];
    const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];
    const replyTo = msg.replies_to;

    if (sender) {
      nodeIds.add(sender);
    }

    for (const mentioned of mentions) {
      if (!mentioned) continue;
      incrementEdge(sender, mentioned, 3);
    }

    if (replyTo) {
      const replyTargetSender = messageSenderById.get(replyTo) || replyTo;
      incrementEdge(sender, replyTargetSender, 2);
    }

    for (const reaction of reactions) {
      if (!reaction || !reaction.user_id) continue;
      incrementEdge(reaction.user_id, sender, 1);
    }
  }

  const edges = buildEdgeList(edgeWeights);
  const adjacency = createUndirectedAdjacency(nodeIds, edges);
  const degreeMetrics = computeDegreeMetrics(adjacency);
  const betweenness = computeBetweennessCentrality(adjacency);
  const clusterAssignments = detectCommunities(adjacency);

  const nodes = Array.from(nodeIds).map((id) => {
    const metrics = degreeMetrics.get(id) || { degree: 0, weightedDegree: 0 };
    return {
      id,
      degree: metrics.degree,
      weightedDegree: metrics.weightedDegree,
      betweenness: betweenness.get(id) || 0,
      clusterId: clusterAssignments.get(id) ?? 0,
    };
  });

  const clusters = summarizeClusters(clusterAssignments);

  const stats = {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    topConnectors: nodes
      .slice()
      .sort((a, b) => b.weightedDegree - a.weightedDegree || b.degree - a.degree)
      .slice(0, 5)
      .map(({ id, degree, weightedDegree }) => ({ id, degree, weightedDegree })),
    clusters,
  };

  const orgHealth = computeOrgHealthScore(stats);
  const statsWithHealth = { ...stats, orgHealth };
  log('Org Health Score computed in builder:', orgHealth.score);

  return { nodes, edges, stats: statsWithHealth };
}
