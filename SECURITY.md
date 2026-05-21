# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ |

## Reporting a Vulnerability

modbench runs entirely on the user's machine and does not send telemetry or analytics data to any external service.

**Data flow:** Your prompts are sent **only** to the LLM provider you configure (OpenAI, Anthropic, OpenRouter, Ollama, etc.). modbench itself does not store, log, or transmit prompts elsewhere.

**API keys:** Keys are read from environment variables or config files on your machine. They are passed directly to the respective provider's API. modbench does not store keys after use.

If you discover a security issue:
1. Do **not** open a public issue.
2. Email the maint (see repository contact) with a description and reproduction steps.
3. We will respond within 7 days and work on a fix.

## Best Practices for Users

- Never commit API keys to this repository.
- Use environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) rather than config files for sensitive values.
- The mock provider requires no API key and is safe to use in CI without secrets.
