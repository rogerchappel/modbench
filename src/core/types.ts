/**
 * modbench - Core type definitions
 */

/** Timing metrics for a single benchmark run */
export interface TimingMetrics {
  timeToFirstTokenMs: number | null;
  totalLatencyMs: number;
  streamingLatencyMs: number;
  tokensPerSecond: number | null;
  tokenCount: number | null;
}

/** A single benchmark result */
export interface BenchmarkResult {
  fixtureName: string;
  provider: string;
  model: string;
  prompt: string;
  response: string | null;
  error?: string;
  metrics: TimingMetrics;
  runNumber: number;
  timestamp: string;
}

/** Configuration for a provider */
export interface ProviderConfig {
  name: string;
  providerType: 'openai' | 'anthropic' | 'mock' | 'openrouter' | 'ollama';
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

/** Benchmark configuration */
export interface BenchmarkConfig {
  providers: ProviderConfig[];
  defaultRuns?: number;
  outputDir?: string;
}

/** A prompt fixture for benchmarking */
export interface BenchmarkFixture {
  name: string;
  description: string;
  prompt: string;
  expectedPatterns?: string[];
  category?: string;
}

/** Statistical summary of results */
export interface StatisticalSummary {
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

/** Complete benchmark report */
export interface BenchmarkReport {
  runId: string;
  timestamp: string;
  modbenchVersion: string;
  results: BenchmarkResult[];
  summaries: {
    [key: string]: {
      provider: string;
      model: string;
      runCount: number;
      ttft?: StatisticalSummary;
      totalLatency?: StatisticalSummary;
      tokensPerSecond?: StatisticalSummary;
      tokenCount?: StatisticalSummary;
    };
  };
  errors: number;
  successes: number;
}
