/**
 * modbench - JSON report generation
 * Generates a JSON report and optionally writes it to a file.
 */

import type { BenchmarkResult } from '../core/types.js';
import { computeSummary } from '../analysis/stats.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export function buildReportData(results: BenchmarkResult[]): string {
  const summaries: Record<string, unknown> = {};

  // Group results by provider:model:fixture
  for (const result of results) {
    const key = `${result.provider}:${result.model}:${result.fixtureName}`;
    if (!summaries[key]) {
      summaries[key] = {
        provider: result.provider,
        model: result.model,
        runCount: 0,
        fixtureName: result.fixtureName,
      };
    }
    (summaries[key] as Record<string, number>).runCount += 1;
  }

  // Compute per-provider statistics
  const providerGroups: Record<string, BenchmarkResult[]> = {};
  for (const result of results) {
    const key = `${result.provider}:${result.model}`;
    if (!providerGroups[key]) providerGroups[key] = [];
    providerGroups[key].push(result);
  }

  for (const [key, group] of Object.entries(providerGroups)) {
    const successful = group.filter((r) => !r.error);
    if (successful.length === 0) continue;

    const latencies = successful.map((r) => r.metrics.totalLatencyMs);
    const ttfts = successful.map((r) => r.metrics.timeToFirstTokenMs).filter((v): v is number => v !== null);
    const tps = successful.map((r) => r.metrics.tokensPerSecond).filter((v): v is number => v !== null);
    const tokens = successful.map((r) => r.metrics.tokenCount).filter((v): v is number => v !== null);

    summaries[key] = {
      ...summaries[key] as Record<string, unknown>,
      totalLatency: computeSummary(latencies),
      ttft: ttfts.length > 0 ? computeSummary(ttfts) : undefined,
      tokensPerSecond: tps.length > 0 ? computeSummary(tps) : undefined,
      tokenCount: tokens.length > 0 ? computeSummary(tokens) : undefined,
    };
  }

  return JSON.stringify(
    {
      runId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      modbenchVersion: '0.1.0',
      results,
      summaries,
      errors: results.filter((r) => r.error).length,
      successes: results.filter((r) => !r.error).length,
    },
    null,
    2,
  );
}

export async function writeReportTo(results: BenchmarkResult[], filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, buildReportData(results), 'utf-8');
}
