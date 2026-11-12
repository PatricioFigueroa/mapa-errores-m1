import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  beforeEach(() => localStorage.clear());

  it('saves attempts and returns them from list', () => {
    const service = new ProgressService();
    const attempt = { date: '2026-11-10', topic: 'fracciones', answers: [{ questionId: 'F-01', chosen: 'A' as const }] };
    service.save(attempt);
    expect(service.list()).toEqual([attempt]);
  });

  it('discards corrupt saved JSON', () => {
    localStorage.setItem('mapa-errores:v1', '{not json');
    expect(new ProgressService().list()).toEqual([]);
    expect(localStorage.getItem('mapa-errores:v1')).toBeNull();
  });

  it('keeps only the 50 most recent attempts', () => {
    const service = new ProgressService();
    for (let index = 0; index < 55; index++) {
      service.save({ date: `2026-11-${String(index + 1).padStart(2, '0')}`, topic: null, answers: [] });
    }
    expect(service.list()).toHaveLength(50);
    // attempts stay in chronological order: the five oldest are dropped
    expect(service.list()[0].date).toBe('2026-11-06');
    expect(service.list()[49].date).toBe('2026-11-55');
  });
});
