import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { ArtifactsService } from '../core/artifacts.service';
import { Bank } from '../core/contracts';
import { pickQuiz } from '../core/error-map';
import { PracticeSessionService } from './practice-session.service';

@Component({
  selector: 'app-practice-topics',
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header><ion-toolbar><ion-title>Practicar</ion-title></ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      <h1>Elige un tema</h1>
      @if (bank(); as loaded) {
        <ion-button expand="block" (click)="start(loaded, null)">Todos los temas ({{ loaded.questions.length }})</ion-button>
        @for (topic of topics(loaded); track topic.name) {
          <ion-button expand="block" fill="outline" (click)="start(loaded, topic.name)">{{ topic.name }} ({{ topic.count }})</ion-button>
        }
      } @else if (error()) {
        <p role="alert">No se pudo cargar el banco de preguntas.</p>
      } @else {
        <p>Cargando preguntas…</p>
      }
    </ion-content>
  `,
})
export class TopicPage {
  private readonly artifacts = inject(ArtifactsService);
  private readonly session = inject(PracticeSessionService);
  private readonly router = inject(Router);
  protected readonly bank = signal<Bank | null>(null);
  protected readonly error = signal(false);

  constructor() {
    this.artifacts.loadBank().then((bank) => this.bank.set(bank)).catch(() => this.error.set(true));
  }

  protected topics(bank: Bank): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const question of bank.questions) counts.set(question.topic, (counts.get(question.topic) ?? 0) + 1);
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }

  protected start(bank: Bank, topic: string | null): void {
    const questions = pickQuiz(bank, topic, 5, Date.now());
    if (questions.length === 0) return;
    this.session.start(topic, questions);
    void this.router.navigateByUrl('/practicar/cuestionario');
  }
}
