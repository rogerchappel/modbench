/**
 * modbench - OpenRouter provider integration
 *
 * Benchmarks any model through the OpenRouter API gateway.
 * Uses OpenAI-compatible endpoint for consistency.
 */

import https from "node:https";
import type { Provider, TimingMetrics } from "../core/provider.js";

export interface OpenRouterOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export function createOpenRouterProvider(opts: OpenRouterOptions): Provider {
  const {
    apiKey,
    model = "openai/gpt-4o",
    baseUrl = "https://openrouter.ai/api/v1/chat/completions",
    temperature = 0.7,
    maxTokens = 1000,
  } = opts;

  return {
    name: "openrouter",
    model,

    async complete(prompt: string): Promise<{ text: string; metrics: TimingMetrics }> {
      const startTime = Date.now();
      const url = new URL(baseUrl);

      const body = JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      });

      return new Promise((resolve, reject) => {
        const req = https.request(
          {
            hostname: url.hostname,
            path: url.pathname,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://github.com/rogerchappel/modbench",
              "X-Title": "modbench",
            },
          },
          (res) => {
            const chunks: Buffer[] = [];
            let firstChunkTime: number | null = null;

            res.on("data", (chunk: Buffer) => {
              if (!firstChunkTime) firstChunkTime = Date.now();
              chunks.push(chunk);
            });

            res.on("end", () => {
              const endTime = Date.now();
              const responseBody = Buffer.concat(chunks).toString();

              try {
                const data = JSON.parse(responseBody);
                const text = data.choices?.[0]?.message?.content ?? "";
                const usage = data.usage ?? {};
                const tokens = usage.total_tokens ?? text.split(/\s+/).length;

                resolve({
                  text,
                  metrics: {
                    timeToFirstTokenMs: firstChunkTime ? firstChunkTime - startTime : null,
                    totalLatencyMs: endTime - startTime,
                    streamingLatencyMs: firstChunkTime ? endTime - firstChunkTime : endTime - startTime,
                    tokensPerSecond: tokens / ((endTime - startTime) / 1000),
                    tokenCount: tokens,
                  },
                });
              } catch {
                reject(new Error(`OpenRouter API error: ${responseBody.slice(0, 200)}`));
              }
            });
          },
        );

        req.on("error", reject);
        req.write(body);
        req.end();
      });
    },
  };
}
