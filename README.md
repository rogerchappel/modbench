# modbench ⚖️

**Local-first LLM benchmarking. Run your own fixtures, get your own numbers.**

```bash
npm install -g modbench
modbench run --mock
```

Or try it without installing:

```bash
npx modbench run --mock
```

## Why?

Every LLM provider claims to be the fastest. Every benchmark site uses someone else's numbers. modbench lets you run the benchmarks yourself — locally, with your own fixtures, on your own machine.

**No cloud. No trust. Just your numbers.**

## Commands

### run

Benchmark all fixtures against mock or configured providers:

```bash
modbench run --mock
modbench run --provider openai --runs 5
modbench run --fixture greeting --runs 10
```

### fixtures

List available benchmark fixtures:

```bash
$ modbench fixtures

Available benchmark fixtures (5):

  greeting
    Test basic conversational response
    Category: conversation
    Prompt length: 23 chars

  summary
    Test text summarization quality
    Category: comprehension
    Prompt length: 156 chars
```

### report

Generate formatted report from saved results:

```bash
modbench report --file results/bench-2024.json
```

### compare

Compare two benchmark result files:

```bash
modbench compare --file baseline.json latest.json
```

## Built-in Fixtures

| Fixture | Category | Purpose |
|---------|----------|---------|
| greeting | conversation | Basic conversational response |
| summary | comprehension | Text summarization quality |
| code | coding | Code generation accuracy |
| json | structured | JSON output conformance |
| reasoning | logic | Complex reasoning chains |

## Providers

| Provider | Type | Requires API key |
|----------|------|:---:|
| mock | mock | ✗ |
| openai | openai | ✓ |
| anthropic | anthropic | ✓ |
| openrouter | openrouter | ✓ |
| ollama | ollama | ✗ |

## As a Library

```typescript
import { BenchmarkRunner, createMockProvider } from 'modbench';

const provider = createMockProvider({ latencyMs: 100 });
const runner = new BenchmarkRunner(provider);
const results = await runner.runMany(fixtures, { runs: 5 });
```

## Requirements

- Node.js ≥ 18.0.0

## License

MIT — see [LICENSE](LICENSE)
