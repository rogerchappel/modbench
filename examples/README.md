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
```

## Custom Fixtures

Create your own fixture JSON (see `custom-fixtures.json` for format):

```bash
modbench run --mock --fixture-file examples/custom-fixtures.json
```
