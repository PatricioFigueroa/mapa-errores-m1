import { Bank, OptionLetter, Question } from './contracts';

export interface Answer { questionId: string; chosen: OptionLetter }
export interface ErrorEvidence { error: string; weight: number; questionIds: string[]; kind: 'pattern' | 'possible' }
export interface QuizSummary { total: number; correct: number; undiagnosed: number }

const WEIGHTS = [1, 0.5, 0.25];

export function buildErrorMap(bank: Bank, answers: Answer[]): ErrorEvidence[] {
  const questions = new Map(bank.questions.map((question) => [question.id, question]));
  const evidence = new Map<string, { weight: number; questionIds: string[] }>();

  for (const answer of answers) {
    const question = questions.get(answer.questionId);
    if (!question || question.answer === answer.chosen) continue;
    const tags = question.tags[answer.chosen] ?? [];
    tags.slice(0, 3).forEach((tag, index) => {
      const current = evidence.get(tag.error) ?? { weight: 0, questionIds: [] };
      current.weight += WEIGHTS[index];
      if (!current.questionIds.includes(question.id)) current.questionIds.push(question.id);
      evidence.set(tag.error, current);
    });
  }

  return [...evidence.entries()]
    .map(([error, value]) => ({
      error,
      weight: value.weight,
      questionIds: value.questionIds,
      kind: value.questionIds.length >= 2 ? 'pattern' as const : 'possible' as const,
    }))
    .sort((a, b) => Number(b.kind === 'pattern') - Number(a.kind === 'pattern') || b.weight - a.weight || a.error.localeCompare(b.error));
}

export function summarize(bank: Bank, answers: Answer[]): QuizSummary {
  const questions = new Map(bank.questions.map((question) => [question.id, question]));
  let correct = 0;
  let undiagnosed = 0;
  let total = 0;
  for (const answer of answers) {
    const question = questions.get(answer.questionId);
    if (!question) continue;
    total++;
    if (question.answer === answer.chosen) correct++;
    else if ((question.tags[answer.chosen] ?? []).length === 0) undiagnosed++;
  }
  return { total, correct, undiagnosed };
}

export function pickPractice(bank: Bank, error: string, exclude: string[], limit = 3): Question[] {
  const excluded = new Set(exclude);
  return bank.questions
    .filter((question) => !excluded.has(question.id) && Object.values(question.tags).some((tags) => tags?.some((tag) => tag.error === error)))
    .slice(0, limit);
}

export function pickQuiz(bank: Bank, topic: string | null, size: number, seed: number): Question[] {
  const questions = bank.questions.filter((question) => topic === null || question.topic === topic);
  let state = seed >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let index = questions.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [questions[index], questions[other]] = [questions[other], questions[index]];
  }
  return questions.slice(0, Math.max(0, size));
}
