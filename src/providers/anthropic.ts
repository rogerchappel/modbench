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
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
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
    let tokenCount: number | null = null;

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

    const processLine = (line: string): void => {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) return;

      try {
        const event: AnthropicStreamEvent = JSON.parse(trimmed.slice(6));
        const outputTokens = event.usage?.output_tokens ?? event.message?.usage?.output_tokens;
        if (outputTokens !== undefined) {
          tokenCount = outputTokens;
        }
        if (event.type === 'content_block_delta' && event.delta?.text) {
          if (timeToFirstToken === null) {
            timeToFirstToken = performance.now() - startTime;
          }
          fullText += event.delta.text;
        }
      } catch {
        // Skip malformed events
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer) processLine(buffer);
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) processLine(line);
    }

    const totalLatency = performance.now() - startTime;
    const streamingLatency = timeToFirstToken !== null
      ? totalLatency - timeToFirstToken
      : totalLatency;

    const tokensPerSecond = timeToFirstToken !== null && streamingLatency > 0
      && tokenCount !== null
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
