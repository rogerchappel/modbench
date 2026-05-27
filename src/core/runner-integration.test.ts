import { describe, it } from "node:test";
import assert from "node:assert";
import { BenchmarkRunner } from "./runner.js";
import { MockProvider } from "../providers/mock.js";
import type { MockProviderConfig } from "../providers/mock.js";
import type { BenchmarkFixture } from "../core/types.js";

function makeProvider(profile: 'fast' | 'default' | 'slow' | 'variable' = 'default') {
  const config: MockProviderConfig = {
    name: 'test',
    providerType: 'mock',
    model: 'test-model',
    apiKey: '',
    profile,
  };
  return new MockProvider(config);
}

const testFixture: BenchmarkFixture = {
  name: 'integration-test',
  description: 'Testing fixture',
  prompt: 'hello world',
  category: 'test',
};

describe("BenchmarkRunner integration", () => {
  it("completes a full benchmark run with mock provider", async () => {
    const provider = makeProvider('fast');
    const runner = new BenchmarkRunner(provider);
    const results = await runner.run(testFixture, { runs: 2 });

    assert.strictEqual(results.length, 2);
    for (const r of results) {
      assert.ok(r.metrics.timeToFirstTokenMs !== null && r.metrics.timeToFirstTokenMs >= 0, "ttft should be >= 0");
      assert.ok(r.metrics.totalLatencyMs > 0, "total latency should be > 0");
      assert.strictEqual(r.error, undefined, "no errors from mock provider");
      assert.ok(r.response, "should have a response");
    }
  });

  it("produces consistent timing ranges with fast profile", async () => {
    const provider = makeProvider('fast');
    const runner = new BenchmarkRunner(provider);
    const results = await runner.run(testFixture, { runs: 5 });

    // Fast profile: baseMs=100, variance=20, so total latency should be ~80-120ms
    for (const r of results) {
      assert.ok(r.metrics.totalLatencyMs >= 50, `latency too low: ${r.metrics.totalLatencyMs}`);
      assert.ok(r.metrics.totalLatencyMs <= 300, `latency too high: ${r.metrics.totalLatencyMs}`);
    }
  });

  it("slow profile produces higher latency than fast", async () => {
    const fastProvider = makeProvider('fast');
    const fastRunner = new BenchmarkRunner(fastProvider);
    const fastResults = await fastRunner.run(testFixture, { runs: 1 });
    const fastLatency = fastResults[0].metrics.totalLatencyMs;

    const slowProvider = makeProvider('slow');
    const slowRunner = new BenchmarkRunner(slowProvider);
    const slowResults = await slowRunner.run(testFixture, { runs: 1 });
    const slowLatency = slowResults[0].metrics.totalLatencyMs;

    assert.ok(slowLatency > fastLatency,
      `slow (${slowLatency}ms) should be greater than fast (${fastLatency}ms)`);
  });
});
