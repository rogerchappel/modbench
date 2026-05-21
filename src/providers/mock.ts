/**
 * modbench - Mock provider for offline testing and CI
 *
 * Deterministic responses with configurable latency.
 * No API key required — ideal for development pipelines.
 */

import type { Provider, TimingMetrics } from "../core/provider.js";

export interface MockProviderOptions {
  latencyMs?: number;
  model?: string;
  jitterMs?: number;
}

/**
 * Create a mock provider with deterministic responses.
 */
export function createMockProvider(opts: MockProviderOptions = {}): Provider & MockProvider {
  const { latencyMs = 250, model = "mock-gpt", jitterMs = 50 } = opts;
  const _latency = { current: latencyMs };

  return {
    name: "mock",
    model,
    get latency(): number { return _latency.current; },
    set latency(ms: number) { _latency.current = ms; },

    async complete(prompt: string): Promise<{ text: string; metrics: TimingMetrics }> {
      const baseLatency = _latency.current;
      const jitter = jitterMs > 0 ? Math.random() * jitterMs : 0;
      const totalMs = baseLatency + jitter;
      const ttft = totalMs * (0.25 + Math.random() * 0.1);

      return new Promise((resolve) => {
        setTimeout(() => {
          const text = generateMockResponse(prompt, model);
          const tokens = text.split(/\s+/).length;
          const tps = tokens / (totalMs / 1000);

          resolve({
            text,
            metrics: {
              timeToFirstTokenMs: Math.round(ttft),
              totalLatencyMs: Math.round(totalMs),
              streamingLatencyMs: Math.round(totalMs - ttft),
              tokensPerSecond: Math.round(tps * 10) / 10,
              tokenCount: tokens,
            },
          });
        }, totalMs);
      });
    },
  };
}

function generateMockResponse(_prompt: string, model: string): string {
  const responses = [
    "This is a mock response used for benchmarking. It simulates realistic token generation patterns without calling any external API.",
    "Mock providers generate deterministic output for testing benchmark infrastructure without rate limits or API costs.",
    "In a production benchmark, this text would come from the actual LLM provider. For now, it serves as a placeholder for timing measurements.",
  ];
  return `${responses[model.charCodeAt(0) % responses.length]} [${model}]`;
}

type MockProvider = Provider & {
  latency: number;
};
