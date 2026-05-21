# Benchmark Fixtures

Pre-built prompt fixtures for testing LLM providers across different capabilities.

## Categories

| Category | Fixtures | Description |
|---|---|---|
| `basic` | greeting | Short responses, warm-up prompts |
| `nlp` | summarization | Text comprehension and condensation |
| `developer` | code-generation | Programming task generation |
| `cognitive` | reasoning | Math and logic problems |
| `creative` | creative-writing | Prose with stylistic constraints |
| `alignment` | safety | Ethical reasoning and guardrail testing |

## Adding Fixtures

Run `modbench fixtures` to list available fixtures. Add your own by creating a JSON file in this format and passing `--fixture-file`.

## Attribution

Fixtures inspired by [lm-eval-harness](https://github.com/EleutherAI/lm-evaluation-harness) methodology, [HELM](https://crfm.stanford.edu/helm/latest/) taxonomy, and general benchmarking best practices. Renamed and adapted for local-first benchmarking workflows.
