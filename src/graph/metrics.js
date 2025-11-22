function ensureNode(adjacency, nodeId) {
  if (!adjacency.has(nodeId)) {
    adjacency.set(nodeId, new Map());
  }
}

export function createUndirectedAdjacency(nodeIds, edges) {
  const adjacency = new Map();

  for (const id of nodeIds) {
    adjacency.set(id, new Map());
  }

  const addNeighbor = (from, to, weight) => {
    if (!from || !to || from === to) return;
    ensureNode(adjacency, from);
    ensureNode(adjacency, to);

    const neighbors = adjacency.get(from);
    neighbors.set(to, (neighbors.get(to) || 0) + weight);
  };

  for (const edge of edges) {
    if (!edge) continue;
    const weight = typeof edge.weight === 'number' ? edge.weight : 0;
    if (weight <= 0) continue;
    addNeighbor(edge.from, edge.to, weight);
    addNeighbor(edge.to, edge.from, weight);
  }

  return adjacency;
}

export function computeDegreeMetrics(adjacency) {
  const metrics = new Map();

  adjacency.forEach((neighbors, node) => {
    const degree = neighbors.size;
    let weightedDegree = 0;
    neighbors.forEach((weight) => {
      weightedDegree += weight;
    });
    metrics.set(node, { degree, weightedDegree });
  });

  return metrics;
}

export function computeBetweennessCentrality(adjacency) {
  const nodes = Array.from(adjacency.keys());
  const betweenness = new Map(nodes.map((node) => [node, 0]));

  if (nodes.length <= 2) {
    return betweenness;
  }

  for (const source of nodes) {
    const stack = [];
    const predecessors = new Map(nodes.map((n) => [n, []]));
    const sigma = new Map(nodes.map((n) => [n, 0]));
    const distance = new Map(nodes.map((n) => [n, -1]));

    sigma.set(source, 1);
    distance.set(source, 0);

    const queue = [source];

    while (queue.length > 0) {
      const v = queue.shift();
      stack.push(v);

      const neighbors = adjacency.get(v) || new Map();
      neighbors.forEach((_, w) => {
        if (distance.get(w) < 0) {
          distance.set(w, distance.get(v) + 1);
          queue.push(w);
        }
        if (distance.get(w) === distance.get(v) + 1) {
          sigma.set(w, sigma.get(w) + sigma.get(v));
          predecessors.get(w).push(v);
        }
      });
    }

    const delta = new Map(nodes.map((n) => [n, 0]));

    while (stack.length > 0) {
      const w = stack.pop();
      for (const v of predecessors.get(w)) {
        const sigmaW = sigma.get(w);
        if (sigmaW === 0) continue;
        const contribution = (sigma.get(v) / sigmaW) * (1 + delta.get(w));
        delta.set(v, delta.get(v) + contribution);
      }
      if (w !== source) {
        betweenness.set(w, betweenness.get(w) + delta.get(w));
      }
    }
  }

  // Undirected graphs double-count, so divide by 2.
  nodes.forEach((node) => {
    betweenness.set(node, betweenness.get(node) / 2);
  });

  return betweenness;
}
