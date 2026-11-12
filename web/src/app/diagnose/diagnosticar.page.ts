import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonBackButton, IonButtons, IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { ArtifactsService } from '../core/artifacts.service';
import { ApiService } from '../core/api.service';
import { Bank, Catalog, CatalogItem, Manifest, OptionLetter, Question, Tag } from '../core/contracts';
import { EmbedderService } from '../core/embedder.service';
import { formatPassage, formatQuery } from '../core/format';
import { diagnose, rankCatalog } from '../core/ranker';
import { MathTextComponent } from '../shared/math-text.component';

interface ResultError { item: CatalogItem; score: number; exercise: string }
interface DistractorResult { letter: OptionLetter; wrong: string; errors: ResultError[]; count: number | null }
const LETTERS: OptionLetter[] = ['A', 'B', 'C', 'D'];

@Component({
  selector: 'app-diagnosticar',
  imports: [FormsModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton, MathTextComponent],
  template: `
    <ion-header><ion-toolbar>
      <ion-buttons slot="start"><ion-back-button defaultHref="" text="Inicio" /></ion-buttons>
      <ion-title>Diagnosticar una pregunta</ion-title>
    </ion-toolbar></ion-header>
    <ion-content class="ion-padding">
      @if (api.baseUrl) {
        <section>
          <label for="pasted">Pega tu pregunta</label>
          <textarea id="pasted" [(ngModel)]="pasted" rows="5"></textarea>
          <ion-button (click)="structure()">Ordenar con IA</ion-button>
          @if (apiNotice()) { <p role="status">{{ apiNotice() }}</p> }
        </section>
      }
      <p>Escribe matemática entre <code>$...$</code>, por ejemplo <code>$\\frac&#123;1&#125;&#123;2&#125;$</code>.</p>
      <section>
        <label for="topic">Tema</label><input id="topic" [(ngModel)]="topic" />
        <label for="stem">Enunciado</label><textarea id="stem" [(ngModel)]="stem" rows="4"></textarea>
        <p class="preview"><app-math-text [text]="stem" /></p>
        @for (letter of letters; track letter) {
          <div class="option-row">
            <label [for]="'option-' + letter">Alternativa {{ letter }}</label>
            <input [id]="'option-' + letter" [(ngModel)]="options[letter]" />
            <p class="preview"><app-math-text [text]="options[letter]" /></p>
            <label [for]="'answer-' + letter">
              <input type="radio" name="answer" [id]="'answer-' + letter" [value]="letter" [(ngModel)]="answer" /> Correcta
            </label>
            @if (answer !== letter) {
              <label [for]="'count-' + letter">Estudiantes que eligieron {{ letter }} (opcional)</label>
              <input type="number" min="0" [id]="'count-' + letter" [(ngModel)]="counts[letter]" />
            }
          </div>
        }
      </section>
      <ion-button (click)="loadModel()" [disabled]="embedder.status() === 'loading' || embedder.status() === 'ready'">Cargar modelo, 118 MB</ion-button>
      @if (embedder.status() === 'loading') { <p role="status">Cargando modelo: {{ (embedder.progress() * 100).toFixed(0) }} %</p> }
      @if (embedder.status() === 'error') { <p role="alert">No se pudo cargar el modelo. Puedes intentar de nuevo.</p> }
      <ion-button (click)="runDiagnosis()" [disabled]="busy()">Diagnosticar</ion-button>
      @if (validationError()) { <p role="alert">{{ validationError() }}</p> }
      @if (results().length) {
        <p>Estos resultados son hipótesis de errores conceptuales; revisa cada caso.</p>
        @for (result of results(); track result.letter) {
          <section class="result" [attr.data-distractor]="result.letter">
            <h2>Alternativa {{ result.letter }}</h2>
            <app-math-text [text]="result.wrong" />
            @if (result.count !== null) { <p>Marcada por {{ result.count }} estudiantes</p> }
            @if (result.errors.length === 0) { <p>Sin diagnóstico claro</p> }
            @for (error of result.errors; track error.item.id) {
              <article>
                <h3>{{ error.item.name }} ({{ error.score.toFixed(2) }})</h3>
                <p><app-math-text [text]="error.item.description" /></p>
                <p><app-math-text [text]="error.exercise" /></p>
                @if (api.baseUrl) { <ion-button (click)="requestReinforcement(result, error)">Pedir ejercicio de refuerzo</ion-button> }
              </article>
            }
          </section>
        }
        <ion-button (click)="downloadQuestion()">Descargar pregunta</ion-button>
      }
    </ion-content>
  `,
  styles: [`label, input, textarea { display: block; width: 100%; margin: .4rem 0; } input[type=radio] { display: inline; width: auto; } section { margin: 1rem 0; } .option-row, .result { border-top: 1px solid var(--ion-color-medium); padding: .75rem 0; } .preview { min-height: 1.5rem; margin: .3rem 0 1rem; }`],
})
export class DiagnosticarPage {
  readonly letters = LETTERS;
  readonly api = inject(ApiService);
  readonly embedder = inject(EmbedderService);
  private readonly artifacts = inject(ArtifactsService);
  readonly validationError = signal('');
  readonly apiNotice = signal('');
  readonly busy = signal(false);
  readonly results = signal<DistractorResult[]>([]);
  pasted = '';
  stem = '';
  topic = '';
  options: Record<OptionLetter, string> = { A: '', B: '', C: '', D: '' };
  answer: OptionLetter | null = null;
  counts: Record<OptionLetter, number | null> = { A: null, B: null, C: null, D: null };
  private catalog?: Catalog;
  private manifest?: Manifest;
  private catalogVectors?: Float32Array;

  async loadModel(): Promise<void> {
    try { await this.embedder.load(); }
    catch { this.validationError.set('No se pudo cargar el modelo.'); }
  }

  async structure(): Promise<void> {
    try {
      const question = await this.api.structure(this.pasted);
      this.stem = question.stem; this.options = question.options; this.answer = question.answer;
      this.apiNotice.set('Revisa el enunciado, las alternativas y la respuesta correcta.');
    } catch { this.apiNotice.set('No se pudo ordenar la pregunta. Completa el formulario a mano.'); }
  }

  async runDiagnosis(): Promise<void> {
    this.validationError.set(''); this.results.set([]);
    if (!this.stem.trim() || LETTERS.some((letter) => !this.options[letter].trim())) {
      this.validationError.set('Completa el enunciado y las cuatro alternativas.'); return;
    }
    if (new Set(LETTERS.map((letter) => this.options[letter].trim())).size !== 4) {
      this.validationError.set('Las alternativas deben ser distintas.'); return;
    }
    if (!this.answer) { this.validationError.set('Marca la alternativa correcta.'); return; }
    if (this.embedder.status() !== 'ready') { this.validationError.set('Carga el modelo antes de diagnosticar.'); return; }
    this.busy.set(true);
    try {
      const [catalog, manifest] = await Promise.all([this.artifacts.loadCatalog(), this.artifacts.loadManifest()]);
      this.catalog = catalog; this.manifest = manifest;
      if (!this.catalogVectors) {
        if (manifest.model_id === 'fixture-random-vectors') {
          const vectors = await this.embedder.embed(catalog.items.map((item) => formatPassage(item.name)));
          this.catalogVectors = Float32Array.from(vectors.flatMap((vector) => Array.from(vector)));
        } else this.catalogVectors = await this.artifacts.loadEmbeddings();
      }
      const answer = this.answer;
      const distractors = LETTERS.filter((letter) => letter !== answer);
      const queries = await this.embedder.embed(distractors.map((letter) => formatQuery(this.stem, this.options[answer], this.options[letter])));
      const dim = manifest.model_id === 'fixture-random-vectors' ? queries[0].length : manifest.dim;
      const results = distractors.map((letter, i): DistractorResult => ({
        letter, wrong: this.options[letter], count: this.counts[letter],
        errors: diagnose(rankCatalog(queries[i], this.catalogVectors!, dim, 3), manifest.threshold).map(({ index, score }) => ({
          item: catalog.items[index], score, exercise: catalog.items[index].activity,
        })),
      }));
      results.sort((a, b) => (b.count ?? -1) - (a.count ?? -1) || LETTERS.indexOf(a.letter) - LETTERS.indexOf(b.letter));
      this.results.set(results);
    } catch {
      this.validationError.set('No se pudo diagnosticar la pregunta. Revisa los artefactos y el modelo.');
    } finally { this.busy.set(false); }
  }

  async requestReinforcement(result: DistractorResult, error: ResultError): Promise<void> {
    try {
      const exercise = await this.api.reinforce({ stem: this.stem, correct: this.options[this.answer!], wrong: result.wrong, error: { id: error.item.id, name: error.item.name } });
      error.exercise = exercise;
      this.results.set([...this.results()]);
    } catch { error.exercise = error.item.activity; this.results.set([...this.results()]); }
  }

  exportBank(): Bank {
    if (!this.answer || !this.results().length) throw new Error('Diagnose before exporting');
    const tags: Question['tags'] = {};
    for (const result of this.results()) {
      tags[result.letter] = result.errors.map(({ item, score }): Tag => ({ error: item.id, score, source: 'model' }));
    }
    return { version: 1, questions: [{ id: crypto.randomUUID(), topic: this.topic.trim() || 'sin-tema', stem: this.stem.trim(), options: { ...this.options }, answer: this.answer, tags }] };
  }

  downloadQuestion(): void {
    const blob = new Blob([JSON.stringify(this.exportBank(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'pregunta.json'; link.click();
    URL.revokeObjectURL(url);
  }
}
