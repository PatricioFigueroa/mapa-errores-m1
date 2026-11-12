import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton, IonContent, IonHeader, IonRadio, IonRadioGroup, IonTitle, IonToolbar,
} from '@ionic/angular';
import { ProgressService } from '../core/progress.service';
import { OptionLetter } from '../core/contracts';
import { MathTextComponent } from '../shared/math-text.component';
import { PracticeSessionService } from './practice-session.service';

@Component({
  selector: 'app-practice-quiz',
  imports: [IonButton, IonContent, IonHeader, IonRadio, IonRadioGroup, IonTitle, IonToolbar, MathTextComponent],
  template: `
    <ion-header><ion-toolbar><ion-title>Pregunta {{ index() + 1 }} de {{ session.questions.length }}</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      @if (question(); as current) {
        <h1>Pregunta {{ index() + 1 }} de {{ session.questions.length }}</h1>
        <p><app-math-text [text]="current.stem" /></p>
        <ion-radio-group [value]="selected()" (ionChange)="choose($event.detail.value)" aria-label="Elige una alternativa">
          @for (letter of letters; track letter) {
            <ion-radio [value]="letter" labelPlacement="end" justify="start">
              <span>{{ letter }}) <app-math-text [text]="current.options[letter]" /></span>
            </ion-radio>
          }
        </ion-radio-group>
        <div class="controls">
          @if (index() > 0) { <ion-button fill="outline" (click)="previous()">Anterior</ion-button> }
          <ion-button [disabled]="!selected()" (click)="next()">{{ index() === session.questions.length - 1 ? 'Ver resultados' : 'Siguiente' }}</ion-button>
        </div>
      }
    </ion-content>
  `,
  styles: '.controls { display: flex; justify-content: space-between; margin-top: 2rem; } ion-radio { display: flex; margin-block: 1rem; }',
})
export class QuizPage {
  protected readonly session = inject(PracticeSessionService);
  private readonly progress = inject(ProgressService);
  private readonly router = inject(Router);
  protected readonly letters: OptionLetter[] = ['A', 'B', 'C', 'D'];
  protected readonly index = signal(0);
  protected readonly question = computed(() => this.session.questions[this.index()]);
  protected readonly selected = computed(() => {
    const current = this.question();
    return current ? this.session.chosen(current.id) : undefined;
  });

  constructor() {
    if (!this.session.hasQuestions()) void this.router.navigateByUrl('/practicar', { replaceUrl: true });
  }

  protected choose(value: unknown): void {
    const current = this.question();
    if (current && this.letters.includes(value as OptionLetter)) this.session.answer(current.id, value as OptionLetter);
  }

  protected previous(): void {
    this.index.update((index) => Math.max(0, index - 1));
  }

  protected next(): void {
    if (!this.selected()) return;
    if (this.index() < this.session.questions.length - 1) {
      this.index.update((index) => index + 1);
      return;
    }
    this.progress.save({ date: new Date().toISOString(), topic: this.session.topic, answers: this.session.answers });
    void this.router.navigateByUrl('/practicar/resultado');
  }
}
