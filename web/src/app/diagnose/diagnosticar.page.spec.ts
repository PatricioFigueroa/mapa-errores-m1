import { TestBed } from '@angular/core/testing';
import { ArtifactsService } from '../core/artifacts.service';
import { ApiService } from '../core/api.service';
import { Catalog, Manifest, OptionLetter } from '../core/contracts';
import { EmbedderService } from '../core/embedder.service';
import { DiagnosticarPage } from './diagnosticar.page';

const letters: OptionLetter[] = ['A', 'B', 'C', 'D'];
const catalog: Catalog = { version: 1, language: 'es', items: [
  { id: 'E001', name: 'Error uno', description: 'Descripción', topic: 'tema', activity: 'Actividad uno' },
  { id: 'E002', name: 'Error dos', description: 'Descripción', topic: 'tema', activity: 'Actividad dos' },
  { id: 'E003', name: 'Error tres', description: 'Descripción', topic: 'tema', activity: 'Actividad tres' },
] };
const manifest: Manifest = { model_id: 'fixture-random-vectors', variant: 'libre', dim: 3, n_catalog: 3, catalog_sha256: 'x', threshold: 0.3, metrics: {}, created: '2026-11-09' };
const vectors = [new Float32Array([1, 0, 0]), new Float32Array([0, 1, 0]), new Float32Array([0, 0, 1])];

async function setup() {
  const embedder = { status: () => 'ready', progress: () => 1, load: vi.fn(async () => undefined), embed: vi.fn(async (texts: string[]) => texts.map((_, i) => vectors[i % 3])) };
  const api = { baseUrl: '', structure: vi.fn(), reinforce: vi.fn(async () => { throw new Error('offline'); }) };
  TestBed.configureTestingModule({ providers: [
    { provide: ArtifactsService, useValue: { loadCatalog: async () => catalog, loadManifest: async () => manifest } },
    { provide: EmbedderService, useValue: embedder },
    { provide: ApiService, useValue: api },
  ] });
  const fixture = TestBed.createComponent(DiagnosticarPage);
  await fixture.whenStable();
  const page = fixture.componentInstance;
  page.stem = 'Pregunta'; page.options = { A: 'a', B: 'b', C: 'c', D: 'd' }; page.answer = 'B'; page.topic = 'tema';
  return { page, fixture, embedder, api };
}

describe('teacher diagnosis', () => {
  it('shows exactly the three distractors after diagnosis', async () => {
    const { page, fixture } = await setup();
    await page.runDiagnosis(); fixture.detectChanges();
    const blocks = fixture.nativeElement.querySelectorAll('[data-distractor]');
    expect([...blocks].map((el: Element) => el.getAttribute('data-distractor'))).toEqual(['A', 'C', 'D']);
  });

  it('sorts displayed distractors by count C 20, A 5, D 0', async () => {
    const { page, fixture } = await setup();
    page.counts = { A: 5, B: null, C: 20, D: 0 };
    await page.runDiagnosis(); fixture.detectChanges();
    expect([...fixture.nativeElement.querySelectorAll('[data-distractor]')].map((el: Element) => el.getAttribute('data-distractor'))).toEqual(['C', 'A', 'D']);
  });

  it('rejects repeated alternatives', async () => {
    const { page, embedder } = await setup();
    page.options.C = 'a';
    await page.runDiagnosis();
    expect(page.validationError()).toMatch(/distintas/i);
    expect(embedder.embed).not.toHaveBeenCalled();
  });

  it('rejects a question without a correct answer', async () => {
    const { page, embedder } = await setup();
    page.answer = null;
    await page.runDiagnosis();
    expect(page.validationError()).toMatch(/correcta/i);
    expect(embedder.embed).not.toHaveBeenCalled();
  });

  it('downloads bank-shaped JSON tagged only for distractors', async () => {
    const { page } = await setup();
    await page.runDiagnosis();
    const bank = page.exportBank();
    expect(bank.version).toBe(1);
    expect(bank.questions).toHaveLength(1);
    const q = bank.questions[0];
    expect(typeof q.id).toBe('string'); expect(q.id.length).toBeGreaterThan(0);
    expect(Object.keys(bank).sort()).toEqual(['questions', 'version']);
    expect(Object.keys(q).sort()).toEqual(['answer', 'id', 'options', 'stem', 'tags', 'topic']);
    expect(q.topic).toBe('tema'); expect(q.stem).toBe('Pregunta'); expect(q.answer).toBe('B');
    expect(Object.keys(q.options).sort()).toEqual(letters);
    for (const letter of letters) expect(typeof q.options[letter]).toBe('string');
    expect(Object.keys(q.tags).sort()).toEqual(['A', 'C', 'D']);
    for (const tags of Object.values(q.tags)) {
      expect(Array.isArray(tags)).toBe(true);
      expect(tags!.length).toBeLessThanOrEqual(3);
      for (const tag of tags ?? []) {
      expect(Object.keys(tag).sort()).toEqual(['error', 'score', 'source']);
      expect(tag.error).toMatch(/^E[0-9]{3}$/);
      expect(typeof tag.score).toBe('number');
      expect(tag.score).toBeGreaterThanOrEqual(-1); expect(tag.score).toBeLessThanOrEqual(1);
      expect(tag.source).toBe('model');
      }
    }
  });

  it('keeps the catalog activity when reinforcement fails', async () => {
    const { page, fixture } = await setup();
    await page.runDiagnosis();
    await page.requestReinforcement(page.results()[0], page.results()[0].errors[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Actividad uno');
  });
});
