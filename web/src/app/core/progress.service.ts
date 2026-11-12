import { Injectable } from '@angular/core';
import { Answer } from './error-map';

export interface Attempt {
  date: string;
  topic: string | null;
  answers: Answer[];
}

const STORAGE_KEY = 'mapa-errores:v1';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  save(attempt: Attempt): void {
    const attempts = this.list();
    attempts.push(attempt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts.slice(-50)));
  }

  list(): Attempt[] {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return [];
    try {
      const attempts: unknown = JSON.parse(saved);
      if (!Array.isArray(attempts) || !attempts.every(isAttempt)) throw new Error('Invalid saved attempts');
      return attempts;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function isAttempt(value: unknown): value is Attempt {
  if (typeof value !== 'object' || value === null) return false;
  const attempt = value as Partial<Attempt>;
  return typeof attempt.date === 'string' &&
    (attempt.topic === null || typeof attempt.topic === 'string') &&
    Array.isArray(attempt.answers) &&
    attempt.answers.every((answer) => typeof answer?.questionId === 'string' && ['A', 'B', 'C', 'D'].includes(answer.chosen));
}
