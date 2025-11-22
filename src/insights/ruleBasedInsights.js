export function generateRuleBasedInsights(stats) {
  try {
    const nodeCount = stats?.nodeCount ?? 0;
    const edgeCount = stats?.edgeCount ?? 0;
    const topConnectors = Array.isArray(stats?.topConnectors)
      ? stats.topConnectors
      : [];
    const clusters = Array.isArray(stats?.clusters) ? stats.clusters : [];

    // Identify connector users (take ids from top connectors list)
    const connectorUsers = topConnectors.slice(0, 3).map((c) => c.id);

    // Detect possible overload: if the top weightedDegree is much larger than the rest.
    let overloadedUsers = [];
    if (topConnectors.length > 0) {
      const sortedByWeighted = topConnectors
        .slice()
        .sort((a, b) => (b.weightedDegree || 0) - (a.weightedDegree || 0));
      const top = sortedByWeighted[0];
      const others = sortedByWeighted.slice(1).map((x) => x.weightedDegree || 0);
      const medianOthers = others.length
        ? others.slice().sort((a, b) => a - b)[Math.floor(others.length / 2)] || 0
        : 0;
      if ((top?.weightedDegree || 0) >= Math.max(6, 2 * medianOthers)) {
        overloadedUsers = [top.id];
      }
    }

    // Cluster analysis: find large clusters and potential silos.
    const sizes = clusters.map((c) => c.size || 0);
    const avgSize = sizes.length
      ? sizes.reduce((a, b) => a + b, 0) / sizes.length
      : 0;
    const largeClusters = clusters
      .filter((c) => c.size >= Math.max(3, Math.ceil(1.5 * avgSize)))
      .map((c) => c.clusterId);

    // Possible silos: small clusters when multiple clusters exist.
    const possibleSilos = clusters.length > 1
      ? clusters
          .filter((c) => c.size <= Math.max(2, Math.floor(0.5 * avgSize)))
          .map((c) => c.clusterId)
      : [];

    // Build human-readable summary points.
    const summaryPoints = [];
    summaryPoints.push(
      `There ${nodeCount === 1 ? 'is' : 'are'} ${nodeCount} active ${
        nodeCount === 1 ? 'user' : 'users'
      } with ${edgeCount} interaction ${edgeCount === 1 ? 'link' : 'links'}.`
    );

    if (connectorUsers.length) {
      const names = connectorUsers.join(', ');
      summaryPoints.push(`${names} ${connectorUsers.length === 1 ? 'is' : 'are'} key connector${connectorUsers.length === 1 ? '' : 's'} in the network.`);
    }

    if (possibleSilos.length) {
      const ids = possibleSilos.join(', ');
      summaryPoints.push(`Cluster${possibleSilos.length === 1 ? '' : 's'} ${ids} look${possibleSilos.length === 1 ? 's' : ''} relatively isolated compared to the rest.`);
    }

    // Recommendations
    const recommendations = [];
    if (possibleSilos.length) {
      const ids = possibleSilos.join(', ');
      recommendations.push(`Encourage cross-team touchpoints between cluster${possibleSilos.length === 1 ? '' : 's'} ${ids} and the main group (e.g., a recurring sync or shared channels).`);
    }
    if (overloadedUsers.length) {
      const names = overloadedUsers.join(', ');
      recommendations.push(`Distribute responsibilities from a single overloaded connector (${names}) where possible to avoid bottlenecks.`);
    }
    if (nodeCount > 0 && clusters.length > 1 && recommendations.length === 0) {
      recommendations.push('Promote cross-cluster collaboration via joint updates or informal coffee chats.');
    }
    if (nodeCount < 3) {
      recommendations.push('Invite more team members to use the channel to grow the collaboration graph.');
    }

    const result = {
      summaryPoints,
      recommendations,
      meta: {
        possibleSilos,
        overloadedUsers,
        connectorUsers,
        largeClusters,
      },
    };

    return result;
  } catch (_err) {
    // On any unexpected issue, return a minimal safe default to avoid crashing.
    return {
      summaryPoints: ['Insufficient data to compute insights at this time.'],
      recommendations: [],
      meta: {
        possibleSilos: [],
        overloadedUsers: [],
        connectorUsers: [],
        largeClusters: [],
      },
    };
  }
}
