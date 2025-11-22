export function buildWeeklyDigest(stats, insights) {
  const nodeCount = stats?.nodeCount ?? 0;
  const edgeCount = stats?.edgeCount ?? 0;
  const topConnectors = Array.isArray(stats?.topConnectors) ? stats.topConnectors.map(t => t.id) : [];
  const clusters = Array.isArray(stats?.clusters) ? stats.clusters : [];
  const ruleBased = insights?.ruleBased || { summaryPoints: [], recommendations: [], meta: {} };

  const summaryLine = `Collaboration snapshot shows ${nodeCount} ${nodeCount === 1 ? 'user' : 'users'} and ${edgeCount} interaction ${edgeCount === 1 ? 'link' : 'links'}.`;

  const keyHighlights = [];
  if (topConnectors.length) {
    keyHighlights.push(`${topConnectors.slice(0, 3).join(', ')} ${topConnectors.length === 1 ? 'acts' : 'act'} as key connector${topConnectors.length === 1 ? '' : 's'}.`);
  }
  const siloClusters = ruleBased?.meta?.possibleSilos || [];
  if (siloClusters.length) {
    keyHighlights.push(`Cluster${siloClusters.length === 1 ? '' : 's'} ${siloClusters.join(', ')} ${siloClusters.length === 1 ? 'appears' : 'appear'} relatively isolated.`);
  }
  const clusterCount = clusters.length;
  if (!siloClusters.length) {
    keyHighlights.push(clusterCount <= 1 ? 'Single main cluster observed.' : `Multiple clusters observed (${clusterCount}).`);
  }

  const recommendations = (Array.isArray(ruleBased.recommendations) && ruleBased.recommendations.length)
    ? ruleBased.recommendations.slice(0, 5)
    : [
        'Encourage cross-team touchpoints via recurring syncs.',
        'Distribute responsibilities away from single overloaded connectors when possible.',
      ];

  return {
    title: 'Weekly Org Health Digest',
    summaryLine,
    keyHighlights,
    recommendations,
  };
}
