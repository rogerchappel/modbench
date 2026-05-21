/**
 * modbench - Ollama provider integration
 *
 * Benchmarks local LLMs running via Ollama.
 * No API key required — models run on your machine.
 */

import http from "node:http";
import type { Provider } from "../core/provider.js";
import type { ProviderConfig, TimingMetrics } from "../core/types.js";
import { registerProvider } from "../core/provider.js";

export interface OllamaProviderOptions {
  model?: string;
  baseUrl?: string;
}

export class OllamaProvider implements Provider {
  public readonly name = 'ollama';
  public readonly model: string;
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    this.model = config.model || 'llama3.2';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }

  async complete(prompt: string): Promise<{ text: string; metrics: TimingMetrics }> {
    const startTime = Date.now();
    const url = new URL('/api/generate', this.baseUrl);

    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const endTime = Date.now();
            const responseBody = Buffer.concat(chunks).toString();

            if (res.statusCode && res.statusCode >= 400) {
              return reject(new Error(`Ollama API error ${res.statusCode}: ${responseBody.slice(0, 200)}`));
            }

            try {
              const data = JSON.parse(responseBody);
              const text = data.response ?? '';
              const evalMs = data.eval_duration ?? (endTime - startTime) * 1_000_000;
              const totalLatency = endTime - startTime;
              const tokenCount = data.eval_count ?? null;

              resolve({
                text,
                metrics: {
                  timeToFirstTokenMs: Math.round(evalMs / 1_000_000),
                  totalLatencyMs: totalLatency,
                  streamingLatencyMs: Math.round(evalMs / 1_000_000),
                  tokensPerSecond: tokenCount
                    ? Math.round((tokenCount / (evalMs / 1e9)) * 10) / 10
                    : null,
                  tokenCount,
                },
              });
            } catch {
              reject(new Error(`Failed to parse Ollama response: ${responseBody.slice(0, 100)}`));
            }
          });
        },
      );

      req.on('error', reject);
      req.write(JSON.stringify({ model: this.model, prompt, stream: false }));
      req.end();
    });
  }
}

registerProvider('ollama', (config: ProviderConfig) => new OllamaProvider(config));
