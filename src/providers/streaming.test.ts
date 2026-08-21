import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import fixtures from './streaming.fixtures.json' with { type: 'json' };

const originalFetch = globalThis.fetch;
const originalPerformance = globalThis.performance;

function mockStream(chunks: string[]): void {
  globalThis.fetch = async () => new Response(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

function mockClock(...times: number[]): void {
  let index = 0;
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: { now: () => times[index++] },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: originalPerformance,
  });
});

describe('streaming provider token metrics', () => {
  it('uses OpenAI completion usage delivered without content at stream completion', async () => {
    mockClock(0, 100, 1100);
    mockStream([
      'data: {"choices":[{"delta":{"content":"a very long response"},"index":0,"finish_reason":null}]}\n',
      'data: {"choices":[],"usage":{"prompt_tokens":50,"completion_tokens":4,"total_tokens":54}}\n',
      'data: [DONE]\n',
    ]);

    const provider = new OpenAIProvider({ name: 'openai', providerType: 'openai', model: 'test', apiKey: 'test' });
    const result = await provider.complete('prompt');

    assert.equal(result.text, 'a very long response');
    assert.equal(result.metrics.tokenCount, 4);
    assert.equal(result.metrics.tokensPerSecond, 4);
  });

  it('uses the latest Anthropic output usage event rather than content length or input usage', async () => {
    mockClock(0, 100, 1100);
    mockStream([
      'data: {"type":"message_start","message":{"id":"id","model":"test","usage":{"input_tokens":80,"output_tokens":1}}}\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"multibyte 🌏 response"}}\n',
      'data: {"type":"message_delta","usage":{"output_tokens":5}}\n',
    ]);

    const provider = new AnthropicProvider({ name: 'anthropic', providerType: 'anthropic', model: 'test', apiKey: 'test' });
    const result = await provider.complete('prompt');

    assert.equal(result.text, 'multibyte 🌏 response');
    assert.equal(result.metrics.tokenCount, 5);
    assert.equal(result.metrics.tokensPerSecond, 5);
  });
});

describe('streaming provider final event handling', () => {
  for (const fixture of fixtures.openai) {
    it(`OpenAI processes ${fixture.name}`, async () => {
      mockClock(0, 100, 1100);
      mockStream(fixture.chunks);

      const provider = new OpenAIProvider({ name: 'openai', providerType: 'openai', model: 'test', apiKey: 'test' });
      const result = await provider.complete('prompt');

      assert.equal(result.text, fixture.text);
      assert.equal(result.metrics.timeToFirstTokenMs, 100);
      assert.equal(result.metrics.tokenCount, fixture.tokenCount);
      assert.equal(result.metrics.tokensPerSecond, fixture.tokenCount);
    });
  }

  for (const fixture of fixtures.anthropic) {
    it(`Anthropic processes ${fixture.name}`, async () => {
      mockClock(0, 100, 1100);
      mockStream(fixture.chunks);

      const provider = new AnthropicProvider({ name: 'anthropic', providerType: 'anthropic', model: 'test', apiKey: 'test' });
      const result = await provider.complete('prompt');

      assert.equal(result.text, fixture.text);
      assert.equal(result.metrics.timeToFirstTokenMs, 100);
      assert.equal(result.metrics.tokenCount, fixture.tokenCount);
      assert.equal(result.metrics.tokensPerSecond, fixture.tokenCount);
    });
  }
});
