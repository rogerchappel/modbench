/**
 * modbench - Anthropic provider implementation
 */

import type { ProviderConfig, TimingMetrics } from '../core/types.js';
import type { Provider } from '../core/provider.js';
import { registerProvider } from '../core/provider.js';

export interface AnthropicStreamEvent {
  type: string;
  message?: {
    id: string;
    model: string;
  };
  delta?: {
    type: string;
    text: string;
  };
  usage?: {
    output_tokens: number;
  };
}

export class AnthropicProvider implements Provider {
  public readonly name: string;
  public readonly model: string;
  private apiKey: string;
  private baseUrl: string;
  private maxTokens: number;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.maxTokens = config.maxTokens ?? 1024;
  }

  async complete(prompt: string): Promise<{ text: string; metrics: TimingMetrics }> {
    const startTime = performance.now();
    let timeToFirstToken: number | null = null;
    let tokenCount = 0;

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Anthropic API error ${response.status}: ${errorText || response.statusText}`,
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
        if (!trimmed) continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const event: AnthropicStreamEvent = JSON.parse(trimmed.slice(6));
          if (event.type === 'content_block_delta' && event.delta?.text) {
            if (timeToFirstToken === null) {
              timeToFirstToken = performance.now() - startTime;
            }
            tokenCount += event.delta.text.length;
            fullText += event.delta.text;
          }
        } catch {
          // Skip malformed events
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

registerProvider('anthropic', (config: ProviderConfig) => new AnthropicProvider(config));
