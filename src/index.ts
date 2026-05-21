/**
 * modbench - LLM provider benchmarking library
 *
 * Local-first CLI for benchmarking latency, throughput, and output quality.
 * Run your own fixtures, get your own numbers.
 */

export type {
  TimingMetrics,
  BenchmarkResult,
  ProviderConfig,
  BenchmarkConfig,
  BenchmarkFixture,
  StatisticalSummary,
  BenchmarkReport,
} from "./core/types.js";

export type { Provider } from "./core/provider.js";

export { BenchmarkRunner } from "./core/runner.js";
export { MockProvider, MockProfile, MockProviderConfig } from "./providers/mock.js";
export { OpenAIProvider, OpenAIResponseChunk } from "./providers/openai.js";
export { AnthropicProvider } from "./providers/anthropic.js";
export { OpenRouterProvider, OpenRouterProviderOptions } from "./providers/openrouter.js";
export { OllamaProvider, OllamaProviderOptions } from "./providers/ollama.js";
export { loadFixtures, getFixtureByName } from "./core/fixtures.js";
export { loadConfig } from "./config/loader.js";
export { formatMarkdownTable, formatMarkdown, formatCompareMarkdown } from "./output/formatters.js";
export { buildReportData, writeReportTo } from "./output/report.js";
export { percentile, mean, median, stdDev, computeSummary } from "./analysis/stats.js";
