# modbench - TASKS.md

## Wave 0: Scaffold & Baseline
- [x] Initialize git repo, package.json, tsconfig
- [x] Create project structure (src/, tests/, fixtures/
- [x] Set up CLI entry point with `src/index.ts`
- [x] Configure releasebox, CI workflows, validate script

## Wave 1: Benchmark Runner
- [ ] Implement Provider interface: OpenAI, Anthropic, OpenRouter, Ollama
- [ ] Implement BenchmarkRunner: execute prompts, measure metrics
- [ ] Measure: time-to-first-token, total latency, tokens/sec, cost estimate
- [ ] Fixture loading: JSON fixture files with prompts and expected patterns
- [ ] Unit tests with mock provider implementations
- [ ] CLI `modbench run` command

## Wave 2: Configuration & Providers
- [ ] Config file: `.modbench.json` for provider setup, auth, models
- [ ] Support multiple providers in single bench run
- [ ] Model selection and parameter configuration
- [ ] Mock provider with configurable latency profiles for offline testing
- [ ] Integration tests with mock providers

## Wave 3: Reporting & Comparison
- [ ] JSON report generation with per-run metrics, statistical summaries
- [ ] Markdown table output for easy comparison
- [ ] Statistical analysis: mean, median, p50, p95, p99 latencies
- [ ] CLI `modbench report`, `modbench compare`, `modbench fixtures` commands
- [ ] Cross-provider comparison mode

## Wave 4: Polish & Release
- [ ] README with personality, examples, provider setup guide
- [ ] Safety notes: API key handling, rate limiting, cost awareness
- [ ] Package metadata: description, keywords, repository
- [ ] Smoke tests: mock bench runs with deterministic results
- [ ] ReleaseBox config, CI workflow integration
