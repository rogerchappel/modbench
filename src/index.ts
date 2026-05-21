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
export { createMockProvider } from "./providers/mock.js";
export { createOpenAIProvider } from "./providers/openai.js";
export { createAnthropicProvider } from "./providers/anthropic.js";
export { createOpenRouterProvider } from "./providers/openrouter.js";
export { createOllamaProvider } from "./providers/ollama.js";
export { getBuiltinFixtures } from "./core/fixtures.js";
export { loadConfig } from "./config/loader.js";
export { formatReport } from "./output/formatters.js";
export { generateReport } from "./output/report.js";
export { computeStats } from "./analysis/stats.js";
