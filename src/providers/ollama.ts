/**
 * modbench - Ollama provider integration
 *
 * Benchmarks local LLMs running via Ollama.
 * No API key required — models run on your machine.
 */

import http from "node:http";
import type { Provider, TimingMetrics } from "../core/provider.js";

export interface OllamaOptions {
  model: string;
  baseUrl?: string;
}

export function createOllamaProvider(opts: OllamaOptions): Provider {
  const {
    model = "llama3",
    baseUrl = "http://localhost:11434",
  } = opts;

  return {
    name: "ollama",
    model,

    async complete(prompt: string): Promise<{ text: string; metrics: TimingMetrics }> {
      const startTime = Date.now();
      const url = new URL("/api/generate", baseUrl);

      return new Promise((resolve, reject) => {
        const body = JSON.stringify({ model, prompt, stream: false });

        const req = http.request(
          {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
              const endTime = Date.now();
              const responseBody = Buffer.concat(chunks).toString();

              try {
                const data = JSON.parse(responseBody);
                const text = data.response ?? "";
                const evalMs = data.eval_duration ?? (endTime - startTime) * 1_000_000;

                resolve({
                  text,
                  metrics: {
                    timeToFirstTokenMs: Math.round(evalMs / 1_000_000),
                    totalLatencyMs: endTime - startTime,
                    streamingLatencyMs: Math.round(evalMs / 1_000_000),
                    tokensPerSecond: data.eval_count ? Math.round((data.eval_count / evalMs) * 1e9 * 10) / 10 : null,
                    tokenCount: data.eval_count ?? null,
                  },
                });
              } catch {
                reject(new Error(`Ollama API error: ${responseBody.slice(0, 200)}`));
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
