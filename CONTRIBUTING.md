# Contributing to modbench

## Quick Start

1. Fork and clone
2. `npm install`
3. `npm run build`
4. `npm test`
5. Make changes, write tests, repeat

## Architecture Overview

```
src/
├── core/           # Benchmark types, provider interface, fixtures, runner
├── providers/      # LLM provider implementations
│   ├── mock.ts     # Deterministic offline provider (no API key)
│   ├── openai.ts   # OpenAI streaming API
│   ├── anthropic.ts # Anthropic streaming API
│   ├── openrouter.ts # OpenRouter gateway
│   └── ollama.ts   # Local Ollama models
├── config/         # Configuration loader
├── analysis/       # Statistical computation (mean, median, p95, etc.)
├── output/         # Markdown formatters and report generation
└── cli.ts          # CLI entry point (commander)
```

## Adding a Provider

1. Create `src/providers/<name>.ts`
2. Implement the `Provider` interface from `src/core/provider.ts`
3. Call `registerProvider('<name>', ...)` to add to the registry
4. Add provider type to `ProviderConfig.providerType` union
5. Write tests in `src/providers/<name>.test.ts`
6. Export from `src/index.ts`

## Testing

- Unit tests: `npm run build && npm test`
- Integration: `node dist/cli.js run --mock`
- All tests use Node.js native test runner (`node --test`)
- No mocks/stubs required — mock provider is a real provider

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new functionality
- `fix:` bug fixes
- `docs:` documentation changes
- `test:` test additions or fixes
- `refactor:` code restructuring
- `chore:` build, CI, tooling
