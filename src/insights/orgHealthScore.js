import { log } from '../utils/logger.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function median(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function computeOrgHealthScore(stats) {
  try {
    const nodeCount = stats?.nodeCount ?? 0;
    const edgeCount = stats?.edgeCount ?? 0;
    const topConnectors = Array.isArray(stats?.topConnectors) ? stats.topConnectors : [];
    const clusters = Array.isArray(stats?.clusters) ? stats.clusters : [];

    // A. Connectivity (0-25): simple density proxy using edges per user
    const denom = Math.max(1, nodeCount * 2);
    const densityProxy = clamp(edgeCount / denom, 0, 1);
    const A = 25 * densityProxy;

    // B. Balance (0-25): penalize extreme overloads on top connector vs median others
    let B = 25;
    if (topConnectors.length > 1) {
      const top = Math.max(0, topConnectors[0].weightedDegree || 0);
      const others = topConnectors.slice(1).map(c => Math.max(0, c.weightedDegree || 0));
      const med = median(others) || 0;
      const ratio = med > 0 ? top / med : (top > 0 ? 3 : 1);
      const overloadFactor = clamp((ratio - 1) / 2, 0, 1); // ratio 1->0 penalty, 3->1 penalty
      B = 25 * (1 - overloadFactor);
    } else if (topConnectors.length === 1) {
      // No others to compare; mild optimism if single connector exists
      B = 22;
    }

    // C. Anti-Silo (0-25): fewer clusters relative to nodes => better
    const clusterCount = clusters.length;
    let C;
    if (nodeCount === 0) {
      C = 0;
    } else if (clusterCount <= 1) {
      C = 25;
    } else {
      const fragRef = Math.max(1, Math.floor(nodeCount / 4));
      const fragmentation = clamp((clusterCount - 1) / fragRef, 0, 1);
      C = 25 * (1 - fragmentation);
    }

    // D. Cross-Team Interaction (0-25): balanced cluster sizes and not dominated by one cluster
    let D = 25;
    if (clusterCount <= 1 || nodeCount === 0) {
      D = clusterCount <= 1 ? 25 : 0;
    } else {
      const sizes = clusters.map(c => Math.max(0, c.size || 0));
      const total = sizes.reduce((a, b) => a + b, 0) || nodeCount;
      const mean = total / clusterCount;
      const variance = sizes.reduce((acc, s) => acc + Math.pow(s - mean, 2), 0) / clusterCount;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1; // coefficient of variation
      const sizeBalance = clamp(1 - cv, 0, 1); // 1=balanced, 0=uneven

      const largestShare = total > 0 ? Math.max(...sizes) / total : 1;
      const dominancePenalty = clamp((largestShare - 0.5) / 0.5, 0, 1); // >50% reduces score

      let clusterFactor = 1;
      if (clusterCount <= 2) clusterFactor = 1;
      else if (clusterCount <= 4) clusterFactor = 0.9;
      else if (clusterCount <= 6) clusterFactor = 0.75;
      else clusterFactor = 0.6;

      const crossTeamIndex = clamp(sizeBalance * (1 - 0.5 * dominancePenalty) * clusterFactor, 0, 1);
      D = 25 * crossTeamIndex;
    }

    const raw = A + B + C + D;
    const score = Math.round(clamp(raw, 0, 100));

    log('Org Health Score computed:', score);

    return {
      score,
      components: {
        connectivity: Math.round(A),
        balance: Math.round(B),
        antiSilo: Math.round(C),
        crossTeam: Math.round(D),
      },
    };
  } catch (_err) {
    return {
      score: 0,
      components: {
        connectivity: 0,
        balance: 0,
        antiSilo: 0,
        crossTeam: 0,
      },
    };
  }
}
