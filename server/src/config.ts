import type { AppDeps } from './app.js';
import { openAiCompatible, withFallback } from './llm.js';

export function loadConfig(env: NodeJS.ProcessEnv): AppDeps {
  const baseUrl = env.LLM_BASE_URL;
  const model = env.LLM_MODEL;
  if (!baseUrl || !model) throw new Error('LLM_BASE_URL and LLM_MODEL are required');
  const timeout = (value: string | undefined) => (value ? Number(value) : undefined);
  const primary = openAiCompatible({
    baseUrl, model, apiKey: env.LLM_API_KEY,
    timeoutMs: timeout(env.LLM_TIMEOUT_MS), reasoningEffort: env.LLM_REASONING_EFFORT,
  });
  const fallback = env.LLM_FALLBACK_BASE_URL && env.LLM_FALLBACK_MODEL
    ? openAiCompatible({
        baseUrl: env.LLM_FALLBACK_BASE_URL, model: env.LLM_FALLBACK_MODEL, apiKey: env.LLM_FALLBACK_API_KEY,
        timeoutMs: timeout(env.LLM_FALLBACK_TIMEOUT_MS), reasoningEffort: env.LLM_FALLBACK_REASONING_EFFORT,
      })
    : undefined;
  const integer = (value: string | undefined, fallbackValue: number) => {
    if (!value) return fallbackValue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) throw new Error('Quota values must be positive integers');
    return parsed;
  };
  return {
    llm: withFallback(primary, fallback),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? 'http://localhost:8100,http://localhost:4200').split(',').map((origin) => origin.trim()).filter(Boolean),
    dailyCap: integer(env.DAILY_CAP, 200),
    perMinute: integer(env.PER_MINUTE, 10),
  };
}
