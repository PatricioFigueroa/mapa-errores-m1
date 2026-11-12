import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Bank } from './contracts';
import { buildErrorMap, pickPractice, pickQuiz, summarize } from './error-map';

const FIXTURES = resolve(process.cwd(), '../contracts/fixtures');
const bank = JSON.parse(readFileSync(resolve(FIXTURES, 'bank.json'), 'utf8')) as Bank;
const answers = [
  { questionId: 'F-01', chosen: 'A' as const },
  { questionId: 'F-05', chosen: 'A' as const },
  { questionId: 'F-02', chosen: 'A' as const },
  { questionId: 'F-03', chosen: 'B' as const },
];

describe('error map', () => {
  it('combines repeated distractor labels into patterns', () => {
    expect(buildErrorMap(bank, answers)).toEqual([
      { error: 'E001', weight: 2, questionIds: ['F-01', 'F-05'], kind: 'pattern' },
      { error: 'E003', weight: 1, questionIds: ['F-02'], kind: 'possible' },
    ]);
  });

  it('summarizes score and undiagnosed wrong answers', () => {
    expect(summarize(bank, answers)).toEqual({ total: 4, correct: 1, undiagnosed: 0 });
    expect(summarize(bank, [...answers, { questionId: 'F-04', chosen: 'C' }])).toEqual({
      total: 5,
      correct: 1,
      undiagnosed: 1,
    });
  });

  it('weights the first three labels as 1, 0.5, and 0.25', () => {
    const synthetic: Bank = {
      version: 1,
      questions: [{
        ...bank.questions[0],
        id: 'three-tags',
        tags: { A: [
          { error: 'E001', score: 1, source: 'gold' },
          { error: 'E002', score: 1, source: 'gold' },
          { error: 'E003', score: 1, source: 'gold' },
        ] },
      }],
    };
    expect(buildErrorMap(synthetic, [{ questionId: 'three-tags', chosen: 'A' }])).toEqual([
      { error: 'E001', weight: 1, questionIds: ['three-tags'], kind: 'possible' },
      { error: 'E002', weight: 0.5, questionIds: ['three-tags'], kind: 'possible' },
      { error: 'E003', weight: 0.25, questionIds: ['three-tags'], kind: 'possible' },
    ]);
  });

  it('orders equal-weight errors alphabetically within a kind', () => {
    const tied: Bank = {
      version: 1,
      questions: [bank.questions[0], { ...bank.questions[0], id: 'second', tags: { A: [
        { error: 'E002', score: 1, source: 'gold' },
        { error: 'E001', score: 1, source: 'gold' },
      ] } }],
    };
    expect(buildErrorMap(tied, [
      { questionId: 'F-01', chosen: 'A' },
      { questionId: 'second', chosen: 'A' },
    ]).map(({ error }) => error)).toEqual(['E001', 'E002']);
  });

  it('ignores answers for missing questions', () => {
    expect(buildErrorMap(bank, [...answers, { questionId: 'missing', chosen: 'A' }])).toEqual(
      buildErrorMap(bank, answers),
    );
    expect(summarize(bank, [...answers, { questionId: 'missing', chosen: 'A' }])).toEqual(
      summarize(bank, answers),
    );
  });

  it('selects practice questions in bank order while excluding completed questions', () => {
    expect(pickPractice(bank, 'E001', ['F-01']).map(({ id }) => id)).toEqual(['F-05']);
  });

  it('picks deterministic quizzes by topic and without duplicates', () => {
    const topicQuiz = pickQuiz(bank, 'fracciones', 5, 1);
    expect(topicQuiz).toHaveLength(2);
    expect(pickQuiz(bank, 'fracciones', 5, 1).map(({ id }) => id)).toEqual(topicQuiz.map(({ id }) => id));
    const all = pickQuiz(bank, null, 3, 1);
    expect(all).toHaveLength(3);
    expect(new Set(all.map(({ id }) => id)).size).toBe(3);
  });
});
