import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { ArtifactsService } from '../core/artifacts.service';
import { Bank, Catalog, OptionLetter, Question } from '../core/contracts';
import { Answer, ErrorEvidence, buildErrorMap, pickPractice, summarize } from '../core/error-map';
import { ProgressService } from '../core/progress.service';
import { MathTextComponent } from '../shared/math-text.component';
import { PracticeSessionService } from './practice-session.service';

@Component({
  selector: 'app-practice-result',
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar, MathTextComponent, RouterLink],
  template: `
    <ion-header><ion-toolbar><ion-title>Tu mapa de errores</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      @if (bank(); as loadedBank) {
        @if (catalog(); as loadedCatalog) {
          <h1>Resultado: {{ summary(loadedBank, session.answers).correct }} de {{ summary(loadedBank, session.answers).total }} correctas</h1>
          <p role="note">El mapa es una hipótesis, no un diagnóstico seguro.</p>
          @if (summary(loadedBank, session.answers).undiagnosed > 0) {
            <p>{{ summary(loadedBank, session.answers).undiagnosed }} respuestas quedaron sin diagnóstico claro.</p>
          }
          @for (item of errors(loadedBank, session.answers, 'pattern'); track item.error) {
            @if (catalogItem(loadedCatalog, item.error); as detail) {
              <section>
                <h2>Patrón: {{ detail.name }}</h2>
                <p>{{ detail.description }}</p>
                <p><app-math-text [text]="detail.activity" /></p>
                <p>Respaldado por: {{ item.questionIds.join(', ') }}</p>
                @if (practiceQuestions(loadedBank, item).length > 0) {
                  <ion-button (click)="practice(loadedBank, item)">Practicar este error</ion-button>
                }
              </section>
            }
          }
          @for (item of errors(loadedBank, session.answers, 'possible'); track item.error) {
            @if (catalogItem(loadedCatalog, item.error); as detail) {
              <section class="possible">
                <h2>Posible error: {{ detail.name }}</h2>
                <p>{{ detail.description }}</p>
                <p><app-math-text [text]="detail.activity" /></p>
                <p>Se observó en: {{ item.questionIds.join(', ') }}</p>
                @if (practiceQuestions(loadedBank, item).length > 0) {
                  <ion-button fill="outline" (click)="practice(loadedBank, item)">Practicar este error</ion-button>
                }
              </section>
            }
          }
          <h2>Revisión de respuestas</h2>
          @for (review of reviews(loadedBank, session.questions, session.answers); track review.question.id) {
            <section>
              <h3>{{ review.question.id }} — <app-math-text [text]="review.question.stem" /></h3>
              <p>Elegiste {{ review.chosen ?? 'sin respuesta' }}. Correcta: {{ review.question.answer }}.</p>
              @if (review.question.solution) { <p><app-math-text [text]="review.question.solution" /></p> }
            </section>
          }
          <ion-button fill="outline" (click)="clearProgress()">Borrar mi progreso</ion-button>
          <ion-button routerLink="/practicar">Volver a los temas</ion-button>
        }
      } @else if (failed()) {
        <p role="alert">No se pudo cargar el resultado.</p>
      } @else {
        <p>Cargando resultado…</p>
      }
    </ion-content>
  `,
  styles: 'section { border-block-start: 1px solid var(--ion-color-step-150, #ddd); padding-block: 1rem; } .possible { opacity: 0.82; }',
})
export class ResultPage {
  protected readonly session = inject(PracticeSessionService);
  private readonly artifacts = inject(ArtifactsService);
  private readonly progress = inject(ProgressService);
  private readonly router = inject(Router);
  protected readonly bank = signal<Bank | null>(null);
  protected readonly catalog = signal<Catalog | null>(null);
  protected readonly failed = signal(false);

  constructor() {
    if (!this.session.hasQuestions()) {
      void this.router.navigateByUrl('/practicar', { replaceUrl: true });
      return;
    }
    Promise.all([this.artifacts.loadBank(), this.artifacts.loadCatalog()])
      .then(([bank, catalog]) => { this.bank.set(bank); this.catalog.set(catalog); })
      .catch(() => this.failed.set(true));
  }

  protected summary(bank: Bank, answers: Answer[]) {
    return summarize(bank, answers);
  }

  protected errors(bank: Bank, answers: Answer[], kind: ErrorEvidence['kind']): ErrorEvidence[] {
    return buildErrorMap(bank, answers).filter((item) => item.kind === kind);
  }

  protected catalogItem(catalog: Catalog, error: string) {
    return catalog.items.find((item) => item.id === error);
  }

  protected practiceQuestions(bank: Bank, item: ErrorEvidence): Question[] {
    return pickPractice(bank, item.error, this.session.answers.map((answer) => answer.questionId));
  }

  protected practice(bank: Bank, item: ErrorEvidence): void {
    this.session.start(this.session.topic, this.practiceQuestions(bank, item));
    void this.router.navigateByUrl('/practicar/cuestionario');
  }

  protected reviews(bank: Bank, questions: Question[], answers: Answer[]) {
    const choices = new Map(answers.map((answer) => [answer.questionId, answer.chosen]));
    return questions.map((question) => ({ question, chosen: choices.get(question.id) as OptionLetter | undefined }))
      .filter(({ question }) => bank.questions.some((candidate) => candidate.id === question.id));
  }

  protected clearProgress(): void {
    this.progress.clear();
  }
}
