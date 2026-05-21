# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- OpenRouter provider for multi-model benchmarking
- Ollama provider for local LLM benchmarking
- Benchmark fixtures across 6 categories (basic, nlp, developer, cognitive, creative, alignment)
- Statistical analysis library (mean, median, stdDev, percentile)
- GitHub Actions CI workflow
- Provider registry with createProvider factory

### Changed
- Improved mock provider with configurable latency profiles
- Library exports consolidated in index.ts barrel file

### Fixed
- Provider import paths for TypeScript compilation
- Test assertion compatibility with AggregateError wrapping

[Unreleased]: https://github.com/rogerchappel/modbench/compare/HEAD...HEAD
