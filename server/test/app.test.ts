import express from 'express';
import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { LlmQuotaError, LlmUnavailableError, openAiCompatible, withFallback, type LlmProvider } from '../src/llm.js';

const valid = JSON.stringify({ stem: 'Uno', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: null });
const success: LlmProvider = { complete: async () => valid };
function app(llm: LlmProvider = success, extra: Partial<Parameters<typeof createApp>[0]> = {}) {
  return createApp({ llm, allowedOrigins: ['https://allowed.example'], dailyCap: 200, perMinute: 10, ...extra });
}

describe('health', () => {
  test('responds successfully', async () => { await request(app()).get('/api/health').expect(200, { ok: true }); });
});

describe('structure', () => {
  test('extracts schema JSON from surrounding prose and a code fence', async () => {
    await request(app({ complete: async () => `resultado:\n\`\`\`json\n${valid}\n\`\`\`` })).post('/api/structure').send({ text: 'pregunta' }).expect(200).expect(({ body }) => expect(Object.keys(body.options)).toEqual(['A', 'B', 'C', 'D']));
  });
  test('retries invalid options once', async () => {
    let calls = 0;
    await request(app({ complete: async () => ++calls === 1 ? JSON.stringify({ stem: 'x', options: ['a'], answer: null }) : valid })).post('/api/structure').send({ text: 'pregunta' }).expect(200);
    expect(calls).toBe(2);
  });
  test('returns bad_output after two invalid responses', async () => {
    await request(app({ complete: async () => 'basura' })).post('/api/structure').send({ text: 'pregunta' }).expect(502, { error: 'bad_output' });
  });
  test.each(['', 'x'.repeat(4001)])('rejects text of length %i without calling provider', async (text) => {
    let calls = 0;
    await request(app({ complete: async () => { calls++; return valid; } })).post('/api/structure').send({ text }).expect(400, { error: 'bad_request' });
    expect(calls).toBe(0);
  });
  test('maps provider quota and availability errors', async () => {
    await request(app({ complete: async () => { throw new LlmQuotaError(); } })).post('/api/structure').send({ text: 'p' }).expect(429, { error: 'quota' });
    await request(app({ complete: async () => { throw new LlmUnavailableError(); } })).post('/api/structure').send({ text: 'p' }).expect(503, { error: 'unavailable' });
  });
  test('uses the fallback on primary quota exhaustion', async () => {
    const llm = withFallback({ complete: async () => { throw new LlmQuotaError(); } }, success);
    await request(app(llm)).post('/api/structure').send({ text: 'p' }).expect(200);
  });
});

describe('reinforce', () => {
  test('truncates generated exercise to 1500 characters', async () => {
    await request(app({ complete: async () => 'x'.repeat(5000) })).post('/api/reinforce').send({ stem: 's', correct: 'c', wrong: 'w', error: { id: 'e', name: 'error' } }).expect(200).expect(({ body }) => expect(body.exercise).toHaveLength(1500));
  });
});

describe('limits and origins', () => {
  test('resets daily count at UTC midnight', async () => {
    let now = new Date('2026-11-09T23:59:59.000Z');
    const server = app(success, { dailyCap: 2, now: () => now });
    const send = () => request(server).post('/api/structure').send({ text: 'p' });
    await send().expect(200); await send().expect(200); await send().expect(429, { error: 'quota' });
    now = new Date('2026-11-10T00:00:00.000Z');
    await send().expect(200);
  });
  test('does not allow an unlisted origin', async () => {
    await request(app()).get('/api/health').set('Origin', 'https://evil.example').expect((res) => expect(res.headers['access-control-allow-origin']).toBeUndefined());
  });
  test('rejects bodies over 16 kB', async () => {
    await request(app()).post('/api/structure').send({ text: 'x'.repeat(17000) }).expect(400, { error: 'bad_request' });
  });
});

describe('OpenAI compatible provider', () => {
  test('sends authorization only when a key exists', async () => {
    const original = globalThis.fetch;
    const seen: Array<Record<string, string>> = [];
    globalThis.fetch = async (_input, init) => { seen.push(init?.headers as Record<string, string>); return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }); };
    try {
      await openAiCompatible({ baseUrl: 'https://api.example/v1', model: 'm' }).complete({ system: 's', user: 'u', maxTokens: 800 });
      await openAiCompatible({ baseUrl: 'https://api.example/v1', apiKey: 'secret', model: 'm' }).complete({ system: 's', user: 'u', maxTokens: 800 });
    } finally { globalThis.fetch = original; }
    expect(seen[0]).not.toHaveProperty('Authorization');
    expect(seen[1].Authorization).toBe('Bearer secret');
  });
  test('sends reasoning_effort only when configured', async () => {
    const original = globalThis.fetch;
    const bodies: Array<Record<string, unknown>> = [];
    globalThis.fetch = async (_input, init) => { bodies.push(JSON.parse(init?.body as string) as Record<string, unknown>); return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }); };
    try {
      await openAiCompatible({ baseUrl: 'https://api.example/v1', model: 'm' }).complete({ system: 's', user: 'u', maxTokens: 800 });
      await openAiCompatible({ baseUrl: 'https://api.example/v1', model: 'm', reasoningEffort: 'none' }).complete({ system: 's', user: 'u', maxTokens: 800 });
    } finally { globalThis.fetch = original; }
    expect(bodies[0]).not.toHaveProperty('reasoning_effort');
    expect(bodies[1]?.reasoning_effort).toBe('none');
  });
  test.each([[429, LlmQuotaError], [500, LlmUnavailableError]] as const)('maps HTTP %i errors', async (status, ErrorType) => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => new Response('{}', { status });
    try { await expect(openAiCompatible({ baseUrl: 'https://api.example/v1', model: 'm' }).complete({ system: 's', user: 'u', maxTokens: 800 })).rejects.toBeInstanceOf(ErrorType); }
    finally { globalThis.fetch = original; }
  });
});

test('loads environment configuration and defaults', () => {
  const config = loadConfig({ LLM_BASE_URL: 'https://api.example/v1', LLM_MODEL: 'model' });
  expect(config.allowedOrigins).toEqual(['http://localhost:8100', 'http://localhost:4200']);
  expect(config.dailyCap).toBe(200);
  expect(config.perMinute).toBe(10);
});
