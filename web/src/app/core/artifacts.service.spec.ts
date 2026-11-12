import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ArtifactError, ArtifactsService } from './artifacts.service';

// Tests run from web/, fixtures live in ../contracts/fixtures.
const FIXTURES = resolve(process.cwd(), '../contracts/fixtures');
const file = (name: string) => readFileSync(resolve(FIXTURES, name));

function stubFetch(overrides: Record<string, Uint8Array | string> = {}) {
  const spy = vi.fn(async (url: string) => {
    const name = url.split('/').pop() as string;
    const body = overrides[name] ?? file(name);
    return new Response(body as BodyInit, { status: 200 });
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('ArtifactsService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loadBank returns the 5 fixture questions with a single request', async () => {
    const spy = stubFetch();
    const service = TestBed.inject(ArtifactsService);
    const [a, b] = await Promise.all([service.loadBank(), service.loadBank()]);
    expect(a.questions).toHaveLength(5);
    expect(b).toBe(a);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('loadCatalog rejects with ArtifactError on version 2', async () => {
    stubFetch({ 'catalog.json': '{"version": 2, "language": "es", "items": []}' });
    await expect(TestBed.inject(ArtifactsService).loadCatalog()).rejects.toBeInstanceOf(ArtifactError);
  });

  it('loadEmbeddings returns 6 * 384 floats for the fixture', async () => {
    stubFetch();
    const embeddings = await TestBed.inject(ArtifactsService).loadEmbeddings();
    expect(embeddings).toBeInstanceOf(Float32Array);
    expect(embeddings.length).toBe(6 * 384);
  });

  it('loadEmbeddings rejects when the size does not match the manifest', async () => {
    stubFetch({ 'catalog.f32': new Uint8Array(100) });
    await expect(TestBed.inject(ArtifactsService).loadEmbeddings()).rejects.toBeInstanceOf(ArtifactError);
  });
});
