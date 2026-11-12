import { Injectable, InjectionToken, inject } from '@angular/core';
import { OptionLetter } from './contracts';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', { providedIn: 'root', factory: () => '' });

export interface StructuredQuestion {
  stem: string;
  options: Record<OptionLetter, string>;
  answer: OptionLetter | null;
}

export interface ReinforceInput {
  stem: string;
  correct: string;
  wrong: string;
  error: { id: string; name: string };
}

export class ApiUnavailableError extends Error {
  constructor() {
    super('Optional server unavailable');
    this.name = 'ApiUnavailableError';
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly baseUrl = inject(API_BASE_URL);

  structure(text: string): Promise<StructuredQuestion> {
    return this.post('/api/structure', { text });
  }

  async reinforce(input: ReinforceInput): Promise<string> {
    const result = await this.post<{ exercise: string }>('/api/reinforce', input);
    return result.exercise;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    if (!this.baseUrl) throw new ApiUnavailableError();
    try {
      const response = await fetch(this.baseUrl.replace(/\/$/, '') + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!response.ok) throw new ApiUnavailableError();
      return await response.json() as T;
    } catch {
      throw new ApiUnavailableError();
    }
  }
}
