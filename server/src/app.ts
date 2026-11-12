import cors from 'cors';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { LlmQuotaError, LlmUnavailableError, type LlmProvider } from './llm.js';

export interface AppDeps { llm: LlmProvider; allowedOrigins: string[]; dailyCap: number; perMinute: number; now?: () => Date }

const structureInput = z.object({ text: z.string().min(1).max(4000) });
const reinforceInput = z.object({
  stem: z.string().max(2000), correct: z.string().max(2000), wrong: z.string().max(2000),
  error: z.object({ id: z.string().max(2000), name: z.string().max(2000) }),
});
const structureOutput = z.object({
  stem: z.string(), options: z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() }),
  answer: z.enum(['A', 'B', 'C', 'D']).nullable(),
});

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('No JSON object found');
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1)) as unknown;
  }
  throw new Error('Incomplete JSON object');
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  const now = deps.now ?? (() => new Date());
  const perIp = new Map<string, number[]>();
  let dailyCount = 0;
  let day = '';
  app.use(cors({ origin: deps.allowedOrigins }));
  app.use(express.json({ limit: '16kb', strict: true }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/structure', async (req, res) => {
    const input = structureInput.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: 'bad_request' });
    if (!takeQuota(req, res)) return;
    const system = 'Ordena el ejercicio entregado y devuelve solo JSON con este esquema: {"stem":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A"|"B"|"C"|"D"|null}. Usa LaTeX para matemáticas entre $...$. No resuelvas el ejercicio. answer solo indica la alternativa marcada como correcta en el texto; si no está marcada, usa null.';
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await deps.llm.complete({ system, user: input.data.text, maxTokens: 1200, json: true });
      try { return res.json(structureOutput.parse(extractJson(raw))); }
      catch { if (attempt === 1) return res.status(502).json({ error: 'bad_output' }); }
    }
    return res.status(502).json({ error: 'bad_output' });
  });
  app.post('/api/reinforce', async (req, res) => {
    const input = reinforceInput.safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: 'bad_request' });
    if (!takeQuota(req, res)) return;
    const { stem, correct, wrong, error } = input.data;
    const exercise = await deps.llm.complete({
      system: 'Propón un único ejercicio breve en español dirigido al error indicado. No incluyas la solución. Responde solo el ejercicio.',
      user: JSON.stringify({ stem, correct, wrong, error }), maxTokens: 1000,
    });
    return res.json({ exercise: exercise.slice(0, 1500) });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof LlmQuotaError) return res.status(429).json({ error: 'quota' });
    if (error instanceof LlmUnavailableError) return res.status(503).json({ error: 'unavailable' });
    if (error instanceof SyntaxError || (typeof error === 'object' && error !== null && 'type' in error)) return res.status(400).json({ error: 'bad_request' });
    return res.status(500).json({ error: 'unavailable' });
  });
  function takeQuota(req: Request, res: Response): boolean {
    const today = now().toISOString().slice(0, 10);
    if (today !== day) { day = today; dailyCount = 0; }
    const current = now().getTime();
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const recent = (perIp.get(ip) ?? []).filter((time) => current - time < 60_000);
    if (recent.length >= deps.perMinute || dailyCount >= deps.dailyCap) {
      res.status(429).json({ error: 'quota' });
      return false;
    }
    recent.push(current);
    perIp.set(ip, recent);
    dailyCount++;
    return true;
  }
  return app;
}
