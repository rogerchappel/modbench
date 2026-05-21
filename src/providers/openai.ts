/**
 * modbench - OpenAI provider implementation
 */

import type { ProviderConfig, TimingMetrics } from '../core/types.js';
import type { Provider } from '../core/provider.js';
import { registerProvider } from '../core/provider.js';

export interface OpenAIResponseChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices?: Array<{
    delta?: { content?: string };
    index: number;
    finish_reason: string | null;
  }>;
  usage?: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements Provider {
  public readonly name: string;
  public readonly model: string;
  private apiKey: string;
  private baseUrl: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.temperature = config.temperature ?? 0;
    this.maxTokens = config.maxTokens ?? 1024;
  }

  async complete(prompt: string): Promise<{ text: string; metrics: TimingMetrics }> {
    const startTime = performance.now();
    let timeToFirstToken: number | null = null;
    let tokenCount = 0;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `OpenAI API error ${response.status}: ${errorText || response.statusText}`,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const chunk: OpenAIResponseChunk = JSON.parse(trimmed.slice(6));
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            if (timeToFirstToken === null) {
              timeToFirstToken = performance.now() - startTime;
            }
            tokenCount += content.length;
            fullText += content;
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    const totalLatency = performance.now() - startTime;
    const streamingLatency = timeToFirstToken !== null
      ? totalLatency - timeToFirstToken
      : totalLatency;

    const tokensPerSecond = timeToFirstToken !== null && streamingLatency > 0
      ? (tokenCount / (streamingLatency / 1000))
      : null;

    return {
      text: fullText,
      metrics: {
        timeToFirstTokenMs: timeToFirstToken,
        totalLatencyMs: totalLatency,
        streamingLatencyMs: streamingLatency,
        tokensPerSecond,
        tokenCount,
      },
    };
  }
}

registerProvider('openai', (config: ProviderConfig) => new OpenAIProvider(config));
