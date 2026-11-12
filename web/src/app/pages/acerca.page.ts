import { Component } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-acerca',
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="" text="Inicio" /></ion-buttons>
        <ion-title>Acerca de</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>
        Mapa de errores es una herramienta que busca el error conceptual detrás de una respuesta incorrecta en
        preguntas de alternativas de matemática.
      </p>
      <p>
        El diagnóstico es una hipótesis: una heurística transparente que no ha sido validada con estudiantes reales.
        Puede equivocarse y no reemplaza el criterio del profesor.
      </p>
      <p>
        Nada sale del dispositivo: la aplicación no tiene cuentas, no envía tus respuestas a ningún servidor y no usa
        analítica.
      </p>
    </ion-content>
  `,
})
export class AcercaPage {}
