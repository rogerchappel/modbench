import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenRouterProvider } from './openrouter.js';
import { OllamaProvider } from './ollama.js';
import { BenchmarkRunner } from '../core/runner.js';
import type { ProviderConfig } from '../core/types.js';

const originalFetch = globalThis.fetch;
const originalOpenAIKey = process.env.OPENAI_API_KEY;
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAIKey;
  if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
});

function config(providerType: 'openai' | 'anthropic', apiKey?: string): ProviderConfig {
  return { name: `${providerType}-primary`, providerType, model: 'test-model', apiKey: apiKey ?? '' };
}

async function capturedHeader(provider: OpenAIProvider | AnthropicProvider, header: string): Promise<string | null> {
  let value: string | null = null;
  globalThis.fetch = async (_input, init) => {
    value = new Headers(init?.headers).get(header);
    return new Response('', { status: 200 });
  };
  await provider.complete('test prompt');
  return value;
}

describe('provider credential resolution', () => {
  it('uses OPENAI_API_KEY when configured apiKey is empty', async () => {
    process.env.OPENAI_API_KEY = 'openai-env';
    assert.strictEqual(await capturedHeader(new OpenAIProvider(config('openai')), 'authorization'), 'Bearer openai-env');
  });

  it('prefers configured OpenAI credentials over the environment', async () => {
    process.env.OPENAI_API_KEY = 'openai-env';
    assert.strictEqual(await capturedHeader(new OpenAIProvider(config('openai', 'openai-config')), 'authorization'), 'Bearer openai-config');
  });

  it('uses ANTHROPIC_API_KEY when configured apiKey is empty', async () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-env';
    assert.strictEqual(await capturedHeader(new AnthropicProvider(config('anthropic')), 'x-api-key'), 'anthropic-env');
  });

  it('prefers configured Anthropic credentials over the environment', async () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-env';
    assert.strictEqual(await capturedHeader(new AnthropicProvider(config('anthropic', 'anthropic-config')), 'x-api-key'), 'anthropic-config');
  });
});

describe('configured provider result attribution', () => {
  for (const [name, provider] of [
    ['backup-router', new OpenRouterProvider({ ...config('openai'), name: 'backup-router', providerType: 'openrouter' })],
    ['local-lab', new OllamaProvider({ ...config('openai'), name: 'local-lab', providerType: 'ollama' })],
  ] as const) {
    it(`records ${name} in BenchmarkRunner output`, async () => {
      provider.complete = async () => ({
        text: 'ok',
        metrics: { timeToFirstTokenMs: 1, totalLatencyMs: 2, streamingLatencyMs: 1, tokensPerSecond: 1, tokenCount: 1 },
      });
      const [result] = await new BenchmarkRunner(provider).run({ name: 'fixture', description: 'test', prompt: 'hello' }, { runs: 1 });
      assert.strictEqual(result.provider, name);
    });
  }
});
