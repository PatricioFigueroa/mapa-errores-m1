import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { ArtifactsService } from '../core/artifacts.service';
import { Bank, Catalog } from '../core/contracts';
import { PracticeSessionService } from './practice-session.service';
import { ResultPage } from './result.page';

const FIXTURES = resolve(process.cwd(), '../contracts/fixtures');
const bank = JSON.parse(readFileSync(resolve(FIXTURES, 'bank.json'), 'utf8')) as Bank;
const catalog = JSON.parse(readFileSync(resolve(FIXTURES, 'catalog.json'), 'utf8')) as Catalog;

describe('ResultPage', () => {
  it('shows E001 as a pattern and explains that the map is a hypothesis', async () => {
    TestBed.configureTestingModule({
      imports: [ResultPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: ArtifactsService, useValue: { loadBank: () => Promise.resolve(bank), loadCatalog: () => Promise.resolve(catalog) } },
      ],
    });
    const session = TestBed.inject(PracticeSessionService);
    session.start('fracciones', bank.questions);
    session.answer('F-01', 'A');
    session.answer('F-05', 'A');
    session.answer('F-02', 'A');
    session.answer('F-03', 'B');
    const fixture = TestBed.createComponent(ResultPage);
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Patrón');
    expect(text).toContain('Suma numeradores y denominadores por separado al sumar fracciones');
    expect(text).toContain('hipótesis, no un diagnóstico seguro');
  });
});
