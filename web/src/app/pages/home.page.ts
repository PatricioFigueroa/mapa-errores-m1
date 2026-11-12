import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ArtifactsService } from '../core/artifacts.service';
import { OptionLetter, Question } from '../core/contracts';
import { MathTextComponent } from '../shared/math-text.component';

@Component({
  selector: 'app-home',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    RouterLink, MathTextComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar><ion-title>Mapa de errores</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card routerLink="/practicar" button>
        <ion-card-header><ion-card-title>Practicar</ion-card-title></ion-card-header>
        <ion-card-content>Responde preguntas y descubre qué errores se repiten.</ion-card-content>
      </ion-card>
      <ion-card routerLink="/diagnosticar" button>
        <ion-card-header><ion-card-title>Diagnosticar una pregunta</ion-card-title></ion-card-header>
        <ion-card-content>Para profesores: encuentra el error detrás de cada distractor.</ion-card-content>
      </ion-card>
      @if (question(); as q) {
        <ion-card>
          <ion-card-header><ion-card-title>Pregunta de ejemplo</ion-card-title></ion-card-header>
          <ion-card-content>
            <p><app-math-text [text]="q.stem" /></p>
            @for (letter of letters; track letter) {
              <p>{{ letter }}) <app-math-text [text]="q.options[letter]" /></p>
            }
          </ion-card-content>
        </ion-card>
      }
      <p class="ion-text-center"><a routerLink="/acerca">Acerca de</a></p>
    </ion-content>
  `,
})
export class HomePage {
  protected readonly letters: OptionLetter[] = ['A', 'B', 'C', 'D'];
  protected readonly question = signal<Question | undefined>(undefined);

  constructor() {
    inject(ArtifactsService)
      .loadBank()
      .then((bank) => this.question.set(bank.questions.find((q) => q.id === 'F-01')))
      .catch(() => this.question.set(undefined));
  }
}
