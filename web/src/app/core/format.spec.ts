import { formatPassage, formatQuery } from './format';

describe('model text format', () => {
  it('formats the query exactly', () => {
    expect(formatQuery('S', 'c', 'w')).toBe('query: Wrong answer: w\nCorrect answer: c\nQuestion: S');
  });

  it('formats the passage exactly', () => {
    expect(formatPassage('n')).toBe('passage: n');
  });
});
