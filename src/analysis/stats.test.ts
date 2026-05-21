import { describe, it } from "node:test";
import assert from "node:assert";
import { mean, median, stdDev, percentile, computeSummary } from "./stats.js";

describe("statistics", () => {
  describe("mean", () => {
    it("calculates average of integers", () => {
      assert.strictEqual(mean([1, 2, 3, 4, 5]), 3);
    });

    it("handles single value", () => {
      assert.strictEqual(mean([42]), 42);
    });

    it("handles negative values", () => {
      assert.strictEqual(mean([-1, 1]), 0);
    });
  });

  describe("median", () => {
    it("finds middle of odd-length array", () => {
      assert.strictEqual(median([1, 3, 5]), 3);
    });

    it("averages middle of even-length array", () => {
      assert.strictEqual(median([1, 2, 3, 4]), 2.5);
    });
  });

  describe("stdDev", () => {
    it("returns 0 for identical values", () => {
      assert.strictEqual(stdDev([5, 5, 5]), 0);
    });

    it("computes positive deviation", () => {
      assert.ok(stdDev([1, 5, 9]) > 0);
    });
  });

  describe("percentile", () => {
    it("p50 equals median", () => {
      assert.strictEqual(percentile([1, 2, 3, 4, 5], 50), median([1, 2, 3, 4, 5]));
    });

    it("p95 captures tail", () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1);
      assert.ok(percentile(values, 95) > percentile(values, 50));
    });
  });

  describe("computeSummary", () => {
    it("returns all expected fields", () => {
      const summary = computeSummary([100, 200, 300, 400, 500]);
      assert.ok(summary.mean > 0);
      assert.ok(summary.median > 0);
      assert.ok(summary.stdDev >= 0);
      assert.ok(summary.p50 > 0);
      assert.ok(summary.p95 > 0);
      assert.ok(summary.p99 > 0);
    });
  });
});
