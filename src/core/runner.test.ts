/**
 * modbench - Runner unit tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { BenchmarkRunner } from './runner.js';
import type { Provider } from './provider.js';
import type { BenchmarkFixture, TimingMetrics } from './types.js';

class TestProvider implements Provider {
  readonly name = 'test';
  readonly model = 'test-model';
  private latency = 50;

  setLatency(ms: number): void {
    this.latency = ms;
  }

  async complete(_prompt: string): Promise<{ text: string; metrics: TimingMetrics }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          text: 'Hello, this is a test response.',
          metrics: {
            timeToFirstTokenMs: this.latency / 2,
            totalLatencyMs: this.latency,
            streamingLatencyMs: this.latency / 2,
            tokensPerSecond: 100,
            tokenCount: 10,
          },
        });
      }, this.latency);
    });
  }
}

const sampleFixture: BenchmarkFixture = {
  name: 'test-fixture',
  description: 'A test fixture',
  prompt: 'Say hello.',
};

describe('BenchmarkRunner', () => {
  let runner: BenchmarkRunner;
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
    runner = new BenchmarkRunner(provider);
  });

  it('returns results equal to the number of runs', async () => {
    const results = await runner.run(sampleFixture, { runs: 3 });
    assert.strictEqual(results.length, 3);
  });

  it('increments run numbers sequentially', async () => {
    const results = await runner.run(sampleFixture, { runs: 3 });
    assert.strictEqual(results[0].runNumber, 1);
    assert.strictEqual(results[1].runNumber, 2);
    assert.strictEqual(results[2].runNumber, 3);
  });

  it('records provider name and model', async () => {
    const results = await runner.run(sampleFixture, { runs: 1 });
    assert.strictEqual(results[0].provider, 'test');
    assert.strictEqual(results[0].model, 'test-model');
  });

  it('includes fixture name in results', async () => {
    const results = await runner.run(sampleFixture, { runs: 1 });
    assert.strictEqual(results[0].fixtureName, 'test-fixture');
  });

  it('uses default runs of 3 when not specified', async () => {
    const results = await runner.run(sampleFixture);
    assert.strictEqual(results.length, 3);
  });

  it('passes the full prompt to provider', async () => {
    const fixture: BenchmarkFixture = {
      name: 'prompt-test',
      description: 'Test',
      prompt: 'What is the meaning of life?',
    };
    const results = await runner.run(fixture, { runs: 1 });
    assert.strictEqual(results[0].prompt, 'What is the meaning of life?');
  });

  it('captures timestamp for each result', async () => {
    const results = await runner.run(sampleFixture, { runs: 1 });
    assert.ok(results[0].timestamp);
    assert.doesNotThrow(() => new Date(results[0].timestamp));
  });

  it('runMany aggregates results from multiple fixtures', async () => {
    const fixtures: BenchmarkFixture[] = [
      sampleFixture,
      { name: 'second', description: 'x', prompt: 'x' },
    ];
    const results = await runner.runMany(fixtures, { runs: 2 });
    assert.strictEqual(results.length, 4);
  });
});
