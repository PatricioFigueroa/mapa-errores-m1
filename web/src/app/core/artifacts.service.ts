import { Injectable, InjectionToken, inject } from '@angular/core';
import { Bank, Catalog, Manifest } from './contracts';

/** Base URL of the artifact directory, relative to the document base href. */
export const ARTIFACTS_BASE_URL = new InjectionToken<string>('ARTIFACTS_BASE_URL', {
  providedIn: 'root',
  factory: () => 'assets/artifacts/',
});

export class ArtifactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtifactError';
  }
}

@Injectable({ providedIn: 'root' })
export class ArtifactsService {
  private readonly base = inject(ARTIFACTS_BASE_URL);
  // Cache the promises so concurrent calls share one request; failures are evicted.
  private readonly cache = new Map<string, Promise<unknown>>();

  loadCatalog(): Promise<Catalog> {
    return this.cached('catalog.json', async () => {
      const catalog = (await this.getJson('catalog.json')) as Catalog;
      this.checkVersion('catalog.json', catalog);
      return catalog;
    });
  }

  loadBank(): Promise<Bank> {
    return this.cached('bank.json', async () => {
      const bank = (await this.getJson('bank.json')) as Bank;
      this.checkVersion('bank.json', bank);
      return bank;
    });
  }

  loadManifest(): Promise<Manifest> {
    return this.cached('manifest.json', () => this.getJson('manifest.json') as Promise<Manifest>);
  }

  loadEmbeddings(): Promise<Float32Array> {
    return this.cached('catalog.f32', async () => {
      const manifest = await this.loadManifest();
      const buffer = await (await this.get('catalog.f32')).arrayBuffer();
      const expected = manifest.n_catalog * manifest.dim * 4;
      if (buffer.byteLength !== expected) {
        throw new ArtifactError(`catalog.f32 has ${buffer.byteLength} bytes, expected ${expected}`);
      }
      // shortcut: assumes a little-endian host (all browsers in practice).
      return new Float32Array(buffer);
    });
  }

  private cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    let hit = this.cache.get(key) as Promise<T> | undefined;
    if (!hit) {
      hit = load();
      this.cache.set(key, hit);
      hit.catch(() => this.cache.delete(key));
    }
    return hit;
  }

  private async get(name: string): Promise<Response> {
    const response = await fetch(this.base + name);
    if (!response.ok) {
      throw new ArtifactError(`${name}: HTTP ${response.status}`);
    }
    return response;
  }

  private async getJson(name: string): Promise<unknown> {
    return (await this.get(name)).json();
  }

  private checkVersion(name: string, data: { version?: unknown }): void {
    if (data.version !== 1) {
      throw new ArtifactError(`${name}: unsupported version ${String(data.version)}`);
    }
  }
}
