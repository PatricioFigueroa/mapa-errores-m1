export interface LlmRequest { system: string; user: string; maxTokens: number; json?: boolean }
export interface LlmProvider { complete(req: LlmRequest): Promise<string> }

export class LlmQuotaError extends Error {
  constructor() { super('LLM quota exceeded'); this.name = 'LlmQuotaError'; }
}
export class LlmUnavailableError extends Error {
  constructor() { super('LLM unavailable'); this.name = 'LlmUnavailableError'; }
}

export function openAiCompatible(opts: { baseUrl: string; apiKey?: string; model: string; timeoutMs?: number; reasoningEffort?: string }): LlmProvider {
  return {
    async complete(req) {
      let response: Response;
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`;
        response = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST', headers,
          signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
          body: JSON.stringify({
            model: opts.model,
            messages: [{ role: 'system', content: req.system }, { role: 'user', content: req.user }],
            max_tokens: Math.max(800, req.maxTokens),
            ...(req.json ? { response_format: { type: 'json_object' } } : {}),
            // local "thinking" models spend the whole token budget reasoning unless told not to
            ...(opts.reasoningEffort ? { reasoning_effort: opts.reasoningEffort } : {}),
          }),
        });
        if (response.status === 429) throw new LlmQuotaError();
        if (!response.ok) throw new LlmUnavailableError();
        const payload: unknown = await response.json();
        if (typeof payload !== 'object' || payload === null || !('choices' in payload)) throw new LlmUnavailableError();
        const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
        if (typeof content !== 'string') throw new LlmUnavailableError();
        return content;
      } catch (error) {
        if (error instanceof LlmQuotaError || error instanceof LlmUnavailableError) throw error;
        throw new LlmUnavailableError();
      }
    },
  };
}

export function withFallback(primary: LlmProvider, fallback?: LlmProvider): LlmProvider {
  return {
    async complete(req) {
      try { return await primary.complete(req); }
      catch (error) {
        if (!(error instanceof LlmQuotaError || error instanceof LlmUnavailableError) || !fallback) throw error;
        return fallback.complete(req);
      }
    },
  };
}
