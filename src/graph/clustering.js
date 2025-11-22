function weightedRandomChoice(weightedEntries) {
  let total = 0;
  for (const { weight } of weightedEntries) {
    total += weight;
  }
  if (total === 0) {
    return weightedEntries[0]?.label ?? 0;
  }
  let threshold = Math.random() * total;
  for (const { label, weight } of weightedEntries) {
    threshold -= weight;
    if (threshold <= 0) {
      return label;
    }
  }
  return weightedEntries[weightedEntries.length - 1]?.label ?? 0;
}

export function detectCommunities(adjacency) {
  const nodes = Array.from(adjacency.keys());
  const labels = new Map(nodes.map((node, idx) => [node, idx]));

  if (nodes.length <= 1) {
    nodes.forEach((node) => labels.set(node, 0));
    return labels;
  }

  const maxIterations = 10;

  for (let iter = 0; iter < maxIterations; iter += 1) {
    let changes = 0;
    const shuffled = nodes.slice().sort(() => Math.random() - 0.5);

    for (const node of shuffled) {
      const neighbors = adjacency.get(node);
      if (!neighbors || neighbors.size === 0) {
        continue;
      }

      const labelWeights = new Map();
      neighbors.forEach((weight, neighbor) => {
        const label = labels.get(neighbor);
        labelWeights.set(label, (labelWeights.get(label) || 0) + weight);
      });

      if (labelWeights.size === 0) {
        continue;
      }

      const weightedEntries = Array.from(labelWeights.entries()).map((entry) => ({
        label: entry[0],
        weight: entry[1],
      }));

      const dominantLabel = weightedRandomChoice(weightedEntries);
      if (dominantLabel !== labels.get(node)) {
        labels.set(node, dominantLabel);
        changes += 1;
      }
    }

    if (changes === 0) {
      break;
    }
  }

  // Normalize labels to sequential cluster IDs.
  const uniqueLabels = Array.from(new Set(labels.values())).sort((a, b) => a - b);
  const labelToCluster = new Map(uniqueLabels.map((label, idx) => [label, idx]));

  nodes.forEach((node) => {
    const originalLabel = labels.get(node);
    labels.set(node, labelToCluster.get(originalLabel) ?? 0);
  });

  return labels;
}
