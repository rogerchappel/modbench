import { describe, it } from "node:test";
import assert from "node:assert";
import { formatMarkdown, formatCompareMarkdown } from "./formatters.js";
import type { BenchmarkResult } from "../core/types.js";

const mockResults: BenchmarkResult[] = [
  {
    provider: "mock",
    model: "mock-gpt",
    fixtureName: "greeting",
    run: 1,
    prompt: "Hello",
    response: "Mock response",
    timestamp: Date.now(),
    timeToFirstTokenMs: 100,
    totalLatencyMs: 500,
    streamingLatencyMs: 400,
    tokensPerSecond: 50,
    tokenCount: 25,
    success: true,
    error: null,
  },
];

describe("formatters", () => {
  it("formatMarkdown produces a table with results header", () => {
    const output = formatMarkdown(mockResults);
    assert.ok(output.includes("modbench Results"));
    assert.ok(output.includes("Summary"));
  });

  it("formatMarkdown includes provider and model columns", () => {
    const output = formatMarkdown(mockResults);
    assert.ok(output.includes("mock"));
    assert.ok(output.includes("mock-gpt"));
  });

  it("formatCompareMarkdown shows both datasets", () => {
    const output = formatCompareMarkdown(mockResults, mockResults);
    assert.ok(output.includes("Benchmark Comparison"));
  });
});
