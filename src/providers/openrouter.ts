/**
 * modbench - OpenRouter provider integration
 *
 * Benchmarks any model through the OpenRouter API gateway.
 * Uses OpenAI-compatible endpoint for consistency.
 */

import https from "node:https";
import type { Provider } from "../core/provider.js";
import type { ProviderConfig, TimingMetrics } from "../core/types.js";
import { registerProvider } from "../core/provider.js";

export interface OpenRouterProviderOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class OpenRouterProvider implements Provider {
  public readonly name = 'openrouter';
  public readonly model: string;
  private apiKey: string;
  private baseUrl: string;
  private temperature: number;

  constructor(config: ProviderConfig) {
    this.model = config.model || 'meta-llama/llama-3-8b-instruct';
    this.apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1/chat/completions';
    this.temperature = config.temperature ?? 0;
  }

  async complete(prompt: string): Promise<{ text: string; metrics: TimingMetrics }> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required (set OPENROUTER_API_KEY or pass apiKey in config)');
    }

    const startTime = Date.now();
    const url = new URL(this.baseUrl);

    const body = JSON.stringify({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: this.temperature,
      max_tokens: 1000,
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/rogerchappel/modbench',
            'X-Title': 'modbench',
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let firstChunkTime: number | null = null;

          res.on('data', (chunk: Buffer) => {
            if (firstChunkTime === null) firstChunkTime = Date.now();
            chunks.push(chunk);
          });

          res.on('end', () => {
            const endTime = Date.now();
            const responseBody = Buffer.concat(chunks).toString();

            if (res.statusCode && res.statusCode >= 400) {
              return reject(new Error(`OpenRouter API error ${res.statusCode}: ${responseBody.slice(0, 200)}`));
            }

            try {
              const data = JSON.parse(responseBody);
              const text = data.choices?.[0]?.message?.content ?? '';
              const usage = data.usage;
              const tokenCount = usage?.total_tokens ?? text.split(/\s+/).length;
              const totalLatency = endTime - startTime;
              const ttft = firstChunkTime ? firstChunkTime - startTime : null;
              const streamingMs = ttft ? totalLatency - ttft : totalLatency;

              resolve({
                text,
                metrics: {
                  timeToFirstTokenMs: ttft,
                  totalLatencyMs: totalLatency,
                  streamingLatencyMs: streamingMs,
                  tokensPerSecond: tokenCount > 0 && streamingMs > 0
                    ? Math.round((tokenCount / (streamingMs / 1000)) * 10) / 10
                    : null,
                  tokenCount,
                },
              });
            } catch {
              reject(new Error(`Failed to parse OpenRouter response: ${responseBody.slice(0, 100)}`));
            }
          });
        },
      );

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

registerProvider('openrouter', (config: ProviderConfig) => new OpenRouterProvider(config));
