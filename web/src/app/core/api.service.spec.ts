import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, ApiService, ApiUnavailableError } from './api.service';

describe('ApiService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects without a configured server and makes no request', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    TestBed.configureTestingModule({ providers: [{ provide: API_BASE_URL, useValue: '' }] });
    await expect(TestBed.inject(ApiService).structure('question')).rejects.toBeInstanceOf(ApiUnavailableError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([429, 502, 503])('rejects HTTP %i as unavailable', async (status) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status })));
    TestBed.configureTestingModule({ providers: [{ provide: API_BASE_URL, useValue: '/server' }] });
    await expect(TestBed.inject(ApiService).structure('question')).rejects.toBeInstanceOf(ApiUnavailableError);
  });

  it('rejects network errors as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    TestBed.configureTestingModule({ providers: [{ provide: API_BASE_URL, useValue: '/server' }] });
    await expect(TestBed.inject(ApiService).reinforce({ stem: 'S', correct: 'c', wrong: 'w', error: { id: 'E001', name: 'n' } })).rejects.toBeInstanceOf(ApiUnavailableError);
  });
});
