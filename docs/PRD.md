# PRD: modbench

Status: in-progress

## Summary

ModBench is a local-first TypeScript CLI for benchmarking LLM provider latency, throughput, and deterministic task quality. It runs predefined prompt fixtures against providers (OpenAI, Anthropic, OpenRouter, local Ollama), measures time-to-first-token, total latency, token throughput, and output consistency across repeated runs.

Built for developers and teams who need evidence-based provider selection without trusting marketing benchmarks.

## Inspiration

- `mikeveerman/tokenspeed` (186 points on HN) shows developer interest in measuring actual token speed.
- No local-first, CLI-based benchmark tool that's fixture-driven and CI-compatible.
- Provider comparisons are scattered across blog posts; developers want reproducible results.

Reframed: modbench is the **wrk/benchmark for LLM APIs** — run your own fixtures, get your own numbers.

## Scorecard

Total: 82/100
Band: build now

| Criterion | Points | Notes |
|---|---:|---|
| Problem pain | 16/20 | Provider choice is hard; marketing benchmarks are unreliable; devs want their own data. |
| Demand signal | 17/20 | Token speed HN post has 186 points; provider comparison tools consistently get attention. |
| V1 buildability | 14/20 | API integration adds complexity but is well-documented; mock mode enables offline testing. |
| Differentiation | 13/15 | CLI-first, deterministic fixtures, CI-friendly, local-results focused (not a hosted dashboard). |
| Agentic workflow leverage | 13/15 | Agents need to pick providers; this gives them evidence. |
| Distribution potential | 9/10 | `modbench.dev` — clear name, broad audience. |

## MVP

- Run benchmarks against configured providers via `.modbench.json` config
- Measure: time-to-first-token, total latency, tokens/sec, cost estimate
- Deterministic fixtures: same prompts, repeated runs, statistical summary
- Mock mode for offline testing (stubbed responses with configurable latency profiles)
- Output: JSON + Markdown table report
- CLI: `modbench run`, `modbench fixtures`, `modbench report`, `modbench compare`

## Tech stack

TypeScript, Node.js CLI, fetch API for HTTP calls

## Non-goals

- No hosted dashboard or web UI
- No model fine-tuning or prompt optimization
- No permanent result storage (local files only)
