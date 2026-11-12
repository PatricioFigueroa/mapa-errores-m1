export interface Ranked { index: number; score: number }

export function rankCatalog(query: Float32Array, catalog: Float32Array, dim: number, k: number): Ranked[] {
  if (dim <= 0 || query.length !== dim || catalog.length % dim !== 0) {
    throw new Error('Embedding dimensions do not match');
  }
  const ranked: Ranked[] = [];
  for (let index = 0; index < catalog.length / dim; index++) {
    let score = 0;
    for (let d = 0; d < dim; d++) score += query[d] * catalog[index * dim + d];
    ranked.push({ index, score });
  }
  return ranked.sort((a, b) => b.score - a.score || a.index - b.index).slice(0, Math.max(0, k));
}

export function diagnose(ranked: Ranked[], threshold: number, top = 3): Ranked[] {
  return ranked.length && ranked[0].score >= threshold ? ranked.slice(0, Math.max(0, top)) : [];
}
