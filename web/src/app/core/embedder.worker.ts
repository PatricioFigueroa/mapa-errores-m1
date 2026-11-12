import { env, pipeline } from '@huggingface/transformers';
import { ModelSource } from './embedder.service';

let extractor: Awaited<ReturnType<typeof pipeline<'feature-extraction'>>> | undefined;

self.onmessage = async ({ data }: MessageEvent<{ type: 'load'; source: ModelSource } | { type: 'embed'; id: number; texts: string[] }>) => {
  try {
    if (data.type === 'load') {
      const source = data.source;
      let modelId = source.kind === 'hub' ? source.id : '';
      if (source.kind === 'local') {
        env.allowRemoteModels = false;
        env.allowLocalModels = true;
        const path = source.path.replace(/\/+$/, '');
        const slash = path.lastIndexOf('/');
        env.localModelPath = path.slice(0, slash + 1) || './';
        modelId = path.slice(slash + 1);
      }
      extractor = await pipeline('feature-extraction', modelId, {
        device: 'wasm', dtype: 'q8',
        progress_callback: (event) => {
          if (event.status === 'progress' && typeof event.progress === 'number') {
            self.postMessage({ type: 'progress', value: event.progress / 100 });
          }
        },
      });
      self.postMessage({ type: 'ready' });
    } else {
      if (!extractor) throw new Error('Model is not loaded');
      const output = await extractor(data.texts, { pooling: 'mean', normalize: true });
      const rows = output.tolist() as number[][];
      self.postMessage({ type: 'result', id: data.id, vectors: rows.map((row) => new Float32Array(row)) });
    }
  } catch (error) {
    self.postMessage({ type: 'error', id: data.type === 'embed' ? data.id : undefined, message: String(error) });
  }
};
