# modbench ⚡

**Benchmark LLM providers locally. Run your own fixtures, get your own numbers.**

Don't trust其他人的 benchmarks. Run them yourself — on your machine, with your prompts, against the models you care about.

```bash
$ modbench run --mock
Running benchmarks with mock provider...

# modbench Results
Total runs: 15 | Errors: 0

## Summary
| Provider:Model     | Runs | Avg Latency | p95 Latency | Avg Tokens/s |
|:-------------------|:----:|------------:|------------:|-------------:|
| mock / mock-gpt    |  15  |     489ms   |     529ms   |        58.3  |
```

## Why?

Every LLM vendor publishes benchmarks that make their model look fastest. Meanwhile, the latency you actually experience depends on geography, network conditions, time of day, and prompt characteristics.

modbench gives you a local-first CLI to:
- **Measure real latency** — TTFT, streaming throughput, total duration
- **Compare providers** — OpenAI vs Anthropic vs OpenRouter vs Ollama side by side
- **Test with your prompts** — use built-in fixtures or bring your own
- **Run offline** — the mock provider needs zero API keys, perfect for CI

## Install

```bash
git clone https://github.com/rogerchappel/modbench.git
cd modbench
npm install
npm run build
npm link  # put modbench on your PATH
```

## Quick Start

**Mock mode (no API keys needed):**
```bash
modbench run --mock
```

**OpenAI:**
```bash
export OPENAI_API_KEY="sk-..."
modbench run --provider openai --model gpt-4o
```

**Custom config:**
```bash
modbench run --config my-benchmark.json
```

**Compare two result files:**
```bash
modbench compare --file results-before.json --file results-after.json
```

## Providers

| Provider | API Key | Latency | Best For |
|---|---|---|---|
| `mock` | ❌ None | Configurable | CI, development, testing |
| `openai` | ✅ Required | ~200-800ms | GPT-4o, o1, o3 benchmarks |
| `anthropic` | ✅ Required | ~300-1200ms | Claude 3.5/4 Sonnet, Opus |
| `openrouter` | ✅ Required | Varies | Any model via gateway |
| `ollama` | ❌ None | Local GPU | Self-hosted models (llama3, mistral) |

## Metrics

Every run measures:
- **Time to First Token (TTFT)** — initial response latency
- **Streaming Latency** — time from first token to completion
- **Total Latency** — end-to-end duration
- **Tokens/Second** — throughput during streaming
- **Token Count** — tokens sent + received

## Fixtures

modbench ships with 6 fixture categories:
- `greeting` — basic prompts (warm-up)
- `summarization` — text comprehension
- `code-generation` — TypeScript, Python, SQL
- `reasoning` — math and logic puzzles
- `creative-writing` — stylistic constraints
- `safety` — ethical reasoning scenarios

## Library API

```typescript
import { BenchmarkRunner, createMockProvider } from 'modbench';

const runner = new BenchmarkRunner();
const provider = createMockProvider({ latencyMs: 200 });
const results = await runner.run(provider, { runs: 5 });
```

## Development

```bash
npm run build    # compile TypeScript
npm test         # run all tests
npm run smoke    # CLI smoke test
```

## License

MIT — use it, break it, benchmark everything.

## Related

- [stackforge](https://github.com/rogerchappel/stackforge) — scaffold generator this was built with
- [ossrank](https://github.com/rogerchappel/ossrank) — GitHub repo quality scoring
- [extaudit](https://github.com/rogerchappel/extaudit) — browser extension security auditor

## Verification

Run these checks before opening a PR or publishing a release:

```bash
pnpm test
pnpm run smoke
pnpm run package:smoke
pnpm run release:check
```
