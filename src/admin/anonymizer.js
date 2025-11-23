/**
 * Anonymization utilities for privacy-friendly analytics
 */

/**
 * Build a deterministic anonymization map from user IDs to anonymized labels
 * @param {string[]} userIds - Array of unique user IDs
 * @returns {Map<string, string>} Map from original ID to anonymized label (e.g., 'user_1')
 */
export function buildAnonymizationMap(userIds) {
  const uniqueIds = [...new Set(userIds)].sort(); // Sort for deterministic mapping
  const map = new Map();
  
  uniqueIds.forEach((id, index) => {
    map.set(id, `user_${index + 1}`);
  });
  
  return map;
}

/**
 * Anonymize a graph by replacing node IDs and edge references
 * @param {Object} graph - Graph object with nodes and edges
 * @param {Map<string, string>} anonMap - Anonymization map
 * @returns {Object} Anonymized graph
 */
export function anonymizeGraph(graph, anonMap) {
  if (!graph || !anonMap) return graph;
  
  const nodes = (graph.nodes || []).map(node => ({
    ...node,
    id: anonMap.get(node.id) || node.id,
  }));
  
  const edges = (graph.edges || []).map(edge => ({
    ...edge,
    from: anonMap.get(edge.from) || edge.from,
    to: anonMap.get(edge.to) || edge.to,
  }));
  
  return { nodes, edges };
}

/**
 * Anonymize stats by replacing user IDs in topConnectors and clusters
 * @param {Object} stats - Stats object
 * @param {Map<string, string>} anonMap - Anonymization map
 * @returns {Object} Anonymized stats
 */
export function anonymizeStats(stats, anonMap) {
  if (!stats || !anonMap) return stats;
  
  const anonymized = { ...stats };
  
  // Anonymize top connectors
  if (Array.isArray(stats.topConnectors)) {
    anonymized.topConnectors = stats.topConnectors.map(connector => ({
      ...connector,
      id: anonMap.get(connector.id) || connector.id,
    }));
  }
  
  // Anonymize cluster node IDs
  if (Array.isArray(stats.clusters)) {
    anonymized.clusters = stats.clusters.map(cluster => ({
      ...cluster,
      nodes: (cluster.nodes || []).map(nodeId => anonMap.get(nodeId) || nodeId),
    }));
  }
  
  return anonymized;
}

/**
 * Anonymize insights by replacing user IDs in meta and text strings
 * @param {Object} insights - Insights object with ruleBased and optional aiPolished
 * @param {Map<string, string>} anonMap - Anonymization map
 * @returns {Object} Anonymized insights
 */
export function anonymizeInsights(insights, anonMap) {
  if (!insights || !anonMap) return insights;
  
  const anonymized = { ...insights };
  
  // Anonymize rule-based insights
  if (insights.ruleBased) {
    const ruleBased = { ...insights.ruleBased };
    
    // Anonymize meta fields that contain user IDs
    if (ruleBased.meta) {
      ruleBased.meta = { ...ruleBased.meta };
      
      if (Array.isArray(ruleBased.meta.connectorUsers)) {
        ruleBased.meta.connectorUsers = ruleBased.meta.connectorUsers.map(
          id => anonMap.get(id) || id
        );
      }
      
      if (Array.isArray(ruleBased.meta.overloadedUsers)) {
        ruleBased.meta.overloadedUsers = ruleBased.meta.overloadedUsers.map(
          id => anonMap.get(id) || id
        );
      }
    }
    
    // Anonymize summary points and recommendations (replace IDs in strings)
    if (Array.isArray(ruleBased.summaryPoints)) {
      ruleBased.summaryPoints = ruleBased.summaryPoints.map(point =>
        replaceUserIdsInString(point, anonMap)
      );
    }
    
    if (Array.isArray(ruleBased.recommendations)) {
      ruleBased.recommendations = ruleBased.recommendations.map(rec =>
        replaceUserIdsInString(rec, anonMap)
      );
    }
    
    anonymized.ruleBased = ruleBased;
  }
  
  // Anonymize AI-polished insights if present
  if (insights.aiPolished) {
    const aiPolished = { ...insights.aiPolished };
    
    if (aiPolished.summaryText) {
      aiPolished.summaryText = replaceUserIdsInString(aiPolished.summaryText, anonMap);
    }
    
    if (Array.isArray(aiPolished.bullets)) {
      aiPolished.bullets = aiPolished.bullets.map(bullet =>
        replaceUserIdsInString(bullet, anonMap)
      );
    }
    
    anonymized.aiPolished = aiPolished;
  }
  
  return anonymized;
}

/**
 * Replace user IDs in a string with their anonymized versions
 * Uses word boundaries to avoid partial matches
 * @param {string} text - Text to anonymize
 * @param {Map<string, string>} anonMap - Anonymization map
 * @returns {string} Anonymized text
 */
function replaceUserIdsInString(text, anonMap) {
  if (typeof text !== 'string') return text;
  
  let result = text;
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedIds = Array.from(anonMap.keys()).sort((a, b) => b.length - a.length);
  
  for (const originalId of sortedIds) {
    const anonId = anonMap.get(originalId);
    if (anonId) {
      // Use word boundaries to replace whole words only
      const regex = new RegExp(`\\b${escapeRegex(originalId)}\\b`, 'g');
      result = result.replace(regex, anonId);
    }
  }
  
  return result;
}

/**
 * Escape special regex characters in a string
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Anonymize a digest object
 * @param {Object} digest - Digest object
 * @param {Map<string, string>} anonMap - Anonymization map
 * @returns {Object} Anonymized digest
 */
export function anonymizeDigest(digest, anonMap) {
  if (!digest || !anonMap) return digest;
  
  const anonymized = { ...digest };
  
  // Anonymize text fields
  if (digest.summaryLine) {
    anonymized.summaryLine = replaceUserIdsInString(digest.summaryLine, anonMap);
  }
  
  if (Array.isArray(digest.keyHighlights)) {
    anonymized.keyHighlights = digest.keyHighlights.map(highlight =>
      replaceUserIdsInString(highlight, anonMap)
    );
  }
  
  if (Array.isArray(digest.recommendations)) {
    anonymized.recommendations = digest.recommendations.map(rec =>
      replaceUserIdsInString(rec, anonMap)
    );
  }
  
  return anonymized;
}


