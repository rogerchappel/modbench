/**
 * modbench - Benchmark runner
 * Executes fixtures against a provider and collects timing metrics.
 */

import type { Provider } from '../core/provider.js';
import type { BenchmarkFixture, BenchmarkResult } from '../core/types.js';

export interface RunOptions {
  runs?: number;
}

export class BenchmarkRunner {
  private provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

  /**
   * Run a single fixture against the provider.
   */
  async run(
    fixture: BenchmarkFixture,
    options: RunOptions = {},
  ): Promise<BenchmarkResult[]> {
    const runCount = options.runs ?? 3;
    const results: BenchmarkResult[] = [];

    for (let i = 0; i < runCount; i++) {
      const runNumber = i + 1;
      try {
        const { text, metrics } = await this.provider.complete(fixture.prompt);
        results.push({
          fixtureName: fixture.name,
          provider: this.provider.name,
          model: this.provider.model,
          prompt: fixture.prompt,
          response: text,
          metrics,
          runNumber,
          timestamp: new Date().toISOString(),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          fixtureName: fixture.name,
          provider: this.provider.name,
          model: this.provider.model,
          prompt: fixture.prompt,
          response: null,
          error: message,
          metrics: {
            timeToFirstTokenMs: null,
            totalLatencyMs: 0,
            streamingLatencyMs: 0,
            tokensPerSecond: null,
            tokenCount: null,
          },
          runNumber,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Run multiple fixtures sequentially.
   */
  async runMany(
    fixtures: BenchmarkFixture[],
    options: RunOptions = {},
  ): Promise<BenchmarkResult[]> {
    const allResults: BenchmarkResult[] = [];

    for (const fixture of fixtures) {
      const results = await this.run(fixture, options);
      allResults.push(...results);
    }

    return allResults;
  }
}
