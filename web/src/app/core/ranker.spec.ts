import { diagnose, rankCatalog } from './ranker';

describe('catalog ranking', () => {
  it('ranks unit vectors by dot product and limits k', () => {
    const catalog = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const ranked = rankCatalog(new Float32Array([0, 1, 0]), catalog, 3, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toEqual({ index: 1, score: 1 });
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  it('abstains below the threshold', () => {
    expect(diagnose([{ index: 1, score: 0.2 }], 0.3)).toEqual([]);
  });

  it('limits diagnosed results to top', () => {
    expect(diagnose([{ index: 1, score: 0.9 }, { index: 0, score: 0.8 }], 0.3, 1)).toEqual([{ index: 1, score: 0.9 }]);
  });
});
