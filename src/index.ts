/**
 * modbench - Public API
 */

export type {
  TimingMetrics,
  BenchmarkResult,
  ProviderConfig,
  BenchmarkConfig,
  BenchmarkFixture,
  StatisticalSummary,
  BenchmarkReport,
} from './core/types.js';

export { type Provider, type ProviderFactory, providerRegistry, registerProvider, createProvider } from './core/provider.js';

export { BenchmarkRunner, type RunOptions } from './core/runner.js';

export { loadFixtures, getFixtureByName } from './core/fixtures.js';

export { OpenAIProvider } from './providers/openai.js';
export { AnthropicProvider } from './providers/anthropic.js';
export { MockProvider, type MockProviderConfig, type MockProfile } from './providers/mock.js';

export { mean, median, stdDev, percentile, computeSummary } from './analysis/stats.js';

export { formatMarkdown, formatCompareMarkdown, formatMarkdownTable } from './output/formatters.js';
export { buildReportData, writeReportTo } from './output/report.js';
