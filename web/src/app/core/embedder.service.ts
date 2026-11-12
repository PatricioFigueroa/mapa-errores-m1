import { Injectable, InjectionToken, inject, signal } from '@angular/core';

export type ModelSource = { kind: 'hub'; id: string } | { kind: 'local'; path: string };
export const MODEL_SOURCE = new InjectionToken<ModelSource>('MODEL_SOURCE', {
  providedIn: 'root', factory: () => ({ kind: 'hub', id: 'Xenova/multilingual-e5-small' }),
});

type WorkerReply =
  | { type: 'progress'; value: number }
  | { type: 'ready' }
  | { type: 'result'; id: number; vectors: Float32Array[] }
  | { type: 'error'; id?: number; message: string };

@Injectable({ providedIn: 'root' })
export class EmbedderService {
  readonly status = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly progress = signal(0);
  private readonly source = inject(MODEL_SOURCE);
  private worker?: Worker;
  private loading?: Promise<void>;
  private nextId = 0;
  private readonly pending = new Map<number, { resolve: (value: Float32Array[]) => void; reject: (reason: Error) => void }>();

  load(): Promise<void> {
    if (this.status() === 'ready') return Promise.resolve();
    if (this.loading) return this.loading;
    this.status.set('loading');
    this.progress.set(0);
    this.worker = new Worker(new URL('./embedder.worker', import.meta.url), { type: 'module' });
    this.loading = new Promise<void>((resolve, reject) => {
      const worker = this.worker!;
      worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
        if (data.type === 'progress') this.progress.set(Math.max(0, Math.min(1, data.value)));
        if (data.type === 'ready') { this.status.set('ready'); this.progress.set(1); resolve(); }
        if (data.type === 'result') {
          this.pending.get(data.id)?.resolve(data.vectors);
          this.pending.delete(data.id);
        }
        if (data.type === 'error') {
          const error = new Error(data.message);
          if (data.id === undefined) { this.status.set('error'); reject(error); }
          else { this.pending.get(data.id)?.reject(error); this.pending.delete(data.id); }
        }
      };
      worker.onerror = () => { this.status.set('error'); reject(new Error('Model worker failed')); };
      worker.postMessage({ type: 'load', source: this.source });
    }).catch((error: unknown) => { this.loading = undefined; throw error; });
    return this.loading;
  }

  async embed(texts: string[]): Promise<Float32Array[]> {
    await this.load();
    const id = ++this.nextId;
    return new Promise<Float32Array[]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'embed', id, texts });
    });
  }
}
