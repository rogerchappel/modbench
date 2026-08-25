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
    it("sorts a copy before interpolating", () => {
      const values = [100, 1, 2];
      assert.strictEqual(percentile(values, 50), 2);
      assert.deepStrictEqual(values, [100, 1, 2]);
    });

    it("returns the endpoints at percentile bounds", () => {
      assert.strictEqual(percentile([30, 10, 20], 0), 10);
      assert.strictEqual(percentile([30, 10, 20], 100), 30);
    });

    it("rejects non-finite and out-of-range percentiles", () => {
      for (const invalid of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.throws(
          () => percentile([1, 2, 3], invalid),
          { name: "RangeError", message: "percentile must be a finite number between 0 and 100" },
        );
      }
    });

    it("handles empty and singleton inputs", () => {
      assert.strictEqual(percentile([], 50), 0);
      assert.strictEqual(percentile([42], 95), 42);
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

    it("keeps percentile fields correct for unsorted input", () => {
      assert.deepStrictEqual(computeSummary([100, 1, 2]), {
        count: 3,
        mean: 103 / 3,
        median: 2,
        stdDev: stdDev([100, 1, 2]),
        min: 1,
        max: 100,
        p50: 2,
        p95: 90.19999999999999,
        p99: 98.04,
      });
    });
  });
});
