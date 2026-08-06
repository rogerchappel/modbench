# modbench Examples

## Basic Benchmark

Run with built-in fixtures using the mock provider:

```bash
modbench run --mock --runs 5
```

## Config File

Create a JSON config and reference it. When `--runs` is omitted, `defaultRuns`
sets the runs per fixture and must be a positive safe integer. Passing `--runs`
overrides the configured value.

When `outputDir` is set, a config-driven run writes JSON results to
`<outputDir>/results.json`, relative to the current working directory. modbench
creates missing parent directories. Pass `--out <path>` to choose a different
file for a run; `--out` takes precedence over `outputDir`.

```json
{
  "providers": [
    { "name": "openai", "providerType": "openai", "model": "gpt-4o", "apiKey": "${OPENAI_API_KEY}" }
  ],
  "defaultRuns": 3,
  "outputDir": "./results"
}
```

```bash
modbench run --config examples/basic-benchmark.json
# Writes ./results/results.json
```

## Custom Fixtures

Create your own fixture JSON (see `custom-fixtures.json` for format):

```bash
modbench run --mock --fixture-file examples/custom-fixtures.json
```
