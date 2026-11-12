import { Injectable } from '@angular/core';
import { Answer } from '../core/error-map';
import { OptionLetter, Question } from '../core/contracts';

@Injectable({ providedIn: 'root' })
export class PracticeSessionService {
  topic: string | null = null;
  questions: Question[] = [];
  answers: Answer[] = [];

  start(topic: string | null, questions: Question[]): void {
    this.topic = topic;
    this.questions = questions;
    this.answers = [];
  }

  answer(questionId: string, chosen: OptionLetter): void {
    const existing = this.answers.find((answer) => answer.questionId === questionId);
    if (existing) existing.chosen = chosen;
    else this.answers.push({ questionId, chosen });
  }

  chosen(questionId: string): OptionLetter | undefined {
    return this.answers.find((answer) => answer.questionId === questionId)?.chosen;
  }

  hasQuestions(): boolean {
    return this.questions.length > 0;
  }
}
