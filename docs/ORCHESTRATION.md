# modbench - ORCHESTRATION.md

## Sub-agent build plan

This project follows the standard StackForge OSS CLI build pattern:

1. Wave 0 (done by scaffold): Baseline project structure
2. Wave 1: Benchmark runner with mock providers and timing metrics
3. Wave 2: Provider configuration and multi-provider support
3. Wave 3: Statistical analysis, reporting, and comparison
4. Wave 4: Polish, README, smoke tests, CI

## Verification commands

```bash
npm test          # Unit tests
npm run build     # TypeScript compilation
bash scripts/validate.sh  # Full validation pipeline
modbench run --mock   # Mock provider smoke test
```

## Commit target

~30-50 atomic commits. Split by: scaffold, runner, providers, mock system, statistical analysis, tests, reporting, docs, CLI commands.
