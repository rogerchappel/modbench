/**
 * modbench - Output formatters
 * Converts benchmark results into human-readable tables.
 */

import type { BenchmarkResult, StatisticalSummary } from '../core/types.js';
import {
  mean,
  computeSummary,
} from '../analysis/stats.js';

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return 'N/A';
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
  return `${n.toFixed(0)}ms`;
}

function formatSummary(s?: StatisticalSummary): string {
  if (!s) return 'N/A';
  return `${formatNumber(s.mean)} (p95: ${formatNumber(s.p95)})`;
}

/**
 * Format a single provider's results as a Markdown table.
 */
export function formatMarkdownTable(
  results: BenchmarkResult[],
  provider: string,
  model: string,
  fixture: string,
): string {
  const filtered = results.filter(
    (r) => r.provider === provider && r.model === model && r.fixtureName === fixture,
  );

  const header = `### ${provider} / ${model} — ${fixture}`;

  if (filtered.length === 0) {
    return `${header}\n\n_No results._\n`;
  }

  const ok = filtered.filter((r) => !r.error);
  const errors = filtered.filter((r) => r.error);

  if (ok.length === 0) {
    return `${header}\n\n_All runs failed._\n`;
  }

  const latencies = ok.map((r) => r.metrics.totalLatencyMs);
  const ttfts = ok.map((r) => r.metrics.timeToFirstTokenMs).filter((v): v is number => v !== null);
  const tps = ok.map((r) => r.metrics.tokensPerSecond).filter((v): v is number => v !== null);

  const latencySummary = computeSummary(latencies);
  const ttftSummary = ttfts.length > 0 ? computeSummary(ttfts) : undefined;
  const tpsSummary = tps.length > 0 ? computeSummary(tps) : undefined;

  let md = `${header}\n\n`;
  md += `| Metric | Value |\n|:--|--:|\n`;
  md += `| Runs | ${filtered.length} (${ok.length} success, ${errors.length} failed) |\n`;
  md += `| Total Latency | ${formatSummary(latencySummary)} |\n`;
  md += `| Time to First Token | ${formatSummary(ttftSummary)} |\n`;
  md += `| Tokens/sec | ${tpsSummary ? `${tpsSummary.mean.toFixed(1)} avg` : 'N/A'} |\n`;

  return md;
}

/**
 * Format all results as a combined Markdown table.
 */
export function formatMarkdown(results: BenchmarkResult[]): string {
  // Group by provider:model:fixture
  const groups: Record<string, BenchmarkResult[]> = {};
  for (const r of results) {
    const key = `${r.provider}::${r.model}::${r.fixtureName}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }

  let md = '# modbench Results\n\n';
  md += `Generated: ${new Date().toISOString()}\n`;
  md += `Total runs: ${results.length}\n`;
  md += `Errors: ${results.filter((r) => r.error).length}\n\n`;
  md += '---\n\n';

  // Overall comparison table
  md += '## Summary\n\n';

  const pmGroups: Record<string, BenchmarkResult[]> = {};
  for (const r of results) {
    const key = `${r.provider}::${r.model}`;
    if (!pmGroups[key]) pmGroups[key] = [];
    pmGroups[key].push(r);
  }

  md += '| Provider:Model | Runs | Avg Latency | p95 Latency | Avg Tokens/s | Errors |\n';
  md += '|:--|:--:|--:|--:|--:|--:|\n';

  for (const [key, group] of Object.entries(pmGroups)) {
    const [provider, model] = key.split('::');
    const ok = group.filter((r) => !r.error);
    if (ok.length === 0) {
      md += `| ${provider}:${model} | ${group.length} | N/A | N/A | N/A | ${group.length} |\n`;
      continue;
    }

    const avgLatency = ok.reduce((a, r) => a + r.metrics.totalLatencyMs, 0) / ok.length;
    const sorted = ok.map((r) => r.metrics.totalLatencyMs).sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Idx];
    const tpss = ok.map((r) => r.metrics.tokensPerSecond).filter((v): v is number => v !== null);
    const avgTps = tpss.length > 0 ? tpss.reduce((a, b) => a + b, 0) / tpss.length : null;
    const errCount = group.filter((r) => r.error).length;

    md += `| ${provider}:${model} | ${group.length} | ${formatNumber(avgLatency)} | ${formatNumber(p95)} | ${avgTps !== null ? avgTps.toFixed(1) : 'N/A'} | ${errCount} |\n`;
  }

  // Per-fixture breakdown
  for (const [key, group] of Object.entries(groups)) {
    const [provider, model, fixture] = key.split('::');
    md += '\n' + formatMarkdownTable(results, provider, model, fixture);
  }

  return md;
}

/**
 * Format results as a cross-provider comparison table.
 */
export function formatCompareMarkdown(results: BenchmarkResult[]): string {
  // Group by fixture, then compare providers
  const fixtureGroups: Record<string, BenchmarkResult[]> = {};
  for (const r of results) {
    if (!fixtureGroups[r.fixtureName]) fixtureGroups[r.fixtureName] = [];
    fixtureGroups[r.fixtureName].push(r);
  }

  let md = '# Cross-Provider Comparison\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '---\n\n';

  // Overall table
  md += '## Overall Results\n\n';
  md += '| Provider:Model | Fixture | Runs | Avg Latency | p95 Latency | Avg Tokens/s | Errors |\n';
  md += '|:--|:--|--:|--:|--:|--:|--:|\n';

  const pmfGroups: Record<string, BenchmarkResult[]> = {};
  for (const r of results) {
    const key = `${r.provider}::${r.model}::${r.fixtureName}`;
    if (!pmfGroups[key]) pmfGroups[key] = [];
    pmfGroups[key].push(r);
  }

  for (const [key, group] of Object.entries(pmfGroups)) {
    const [provider, model, fixture] = key.split('::');
    const ok = group.filter((r) => !r.error);
    if (ok.length === 0) {
      md += `| ${provider}:${model} | ${fixture} | ${group.length} | N/A | N/A | N/A | ${group.length} |\n`;
      continue;
    }

    const avgLatency = ok.reduce((a, r) => a + r.metrics.totalLatencyMs, 0) / ok.length;
    const sorted = ok.map((r) => r.metrics.totalLatencyMs).sort((a, b) => a - b);
    const p95Idx = Math.floor(sorted.length * 0.95);
    const p95 = sorted[p95Idx];
    const tpss = ok.map((r) => r.metrics.tokensPerSecond).filter((v): v is number => v !== null);
    const avgTps = tpss.length > 0 ? tpss.reduce((a, b) => a + b, 0) / tpss.length : null;
    const errCount = group.filter((r) => r.error).length;

    md += `| ${provider}:${model} | ${fixture} | ${group.length} | ${formatNumber(avgLatency)} | ${formatNumber(p95)} | ${avgTps !== null ? avgTps.toFixed(1) : 'N/A'} | ${errCount} |\n`;
  }

  // Per-fixture comparison
  for (const [fixtureName, group] of Object.entries(fixtureGroups)) {
    md += `\n## Fixture: ${fixtureName}\n\n`;
    md += '| Provider:Model | Runs | Avg Latency | p95 Latency | Avg Tokens/s | Errors |\n';
    md += '|:--|--:|--:|--:|--:|--:|\n';

    const byPm: Record<string, BenchmarkResult[]> = {};
    for (const r of group) {
      const k = `${r.provider}::${r.model}`;
      if (!byPm[k]) byPm[k] = [];
      byPm[k].push(r);
    }

    for (const [pmKey, subGroup] of Object.entries(byPm)) {
      const [provider, model] = pmKey.split('::');
      const ok = subGroup.filter((r) => !r.error);
      if (ok.length === 0) {
        md += `| ${provider}:${model} | ${subGroup.length} | N/A | N/A | N/A | ${subGroup.length} |\n`;
        continue;
      }

      const avgLatency = ok.reduce((a, r) => a + r.metrics.totalLatencyMs, 0) / ok.length;
      const sorted = ok.map((r) => r.metrics.totalLatencyMs).sort((a, b) => a - b);
      const p95Idx = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Idx];
      const tpss = ok.map((r) => r.metrics.tokensPerSecond).filter((v): v is number => v !== null);
      const avgTps = tpss.length > 0 ? tpss.reduce((a, b) => a + b, 0) / tpss.length : null;
      const errCount = subGroup.filter((r) => r.error).length;

      md += `| ${provider}:${model} | ${subGroup.length} | ${formatNumber(avgLatency)} | ${formatNumber(p95)} | ${avgTps !== null ? avgTps.toFixed(1) : 'N/A'} | ${errCount} |\n`;
    }
  }

  return md;
}
