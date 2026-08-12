import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { loadConfig } from "./loader.js";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("config loader", () => {
  const tmpDir = join(tmpdir(), "modbench-config-test");
  let configPath = "";

  before(() => {
    mkdirSync(tmpDir, { recursive: true });
  });
  after(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it("rejects missing config file", async () => {
    await assert.rejects(
      () => loadConfig("/nonexistent/path/modbench.json"),
      /ENOENT|not find/
    );
  });

  it("rejects invalid JSON", async () => {
    configPath = join(tmpDir, "bad.json");
    writeFileSync(configPath, "not json");
    await assert.rejects(
      () => loadConfig(configPath),
      /Invalid JSON/
    );
  });

  it("rejects config without providers array", async () => {
    configPath = join(tmpDir, "noproviders.json");
    writeFileSync(configPath, JSON.stringify({ defaultRuns: 5 }));
    await assert.rejects(
      () => loadConfig(configPath),
      /providers/
    );
  });

  it("loads valid config with providers", async () => {
    configPath = join(tmpDir, "valid.json");
    writeFileSync(configPath, JSON.stringify({
      providers: [
        { name: "test", providerType: "mock", model: "gpt", apiKey: "" },
      ],
      defaultRuns: 5,
      outputDir: "my-results",
    }));
    const config = await loadConfig(configPath);
    assert.strictEqual(config.providers.length, 1);
    assert.strictEqual(config.providers[0].name, "test");
    assert.strictEqual(config.defaultRuns, 5);
    assert.strictEqual(config.outputDir, "my-results");
  });

  it("uses defaultRuns=3 when not specified", async () => {
    configPath = join(tmpDir, "default-runs.json");
    writeFileSync(configPath, JSON.stringify({
      providers: [
        { name: "test", providerType: "mock", model: "gpt", apiKey: "" },
      ],
    }));
    const config = await loadConfig(configPath);
    assert.strictEqual(config.defaultRuns, 3);
  });

  it("rejects empty required provider fields with field-specific diagnostics", async () => {
    for (const field of ["name", "providerType", "model"] as const) {
      configPath = join(tmpDir, `empty-${field}.json`);
      const provider = { name: "test", providerType: "mock", model: "gpt", [field]: "  " };
      writeFileSync(configPath, JSON.stringify({ providers: [provider] }));

      await assert.rejects(() => loadConfig(configPath), new RegExp(`providers\\[0\\]\\.${field}`));
    }
  });

  it("rejects unsupported provider types", async () => {
    configPath = join(tmpDir, "unsupported-provider.json");
    writeFileSync(configPath, JSON.stringify({
      providers: [{ name: "test", providerType: "bogus", model: "gpt" }],
    }));

    await assert.rejects(
      () => loadConfig(configPath),
      /providers\[0\]\.providerType must be one of: openai, anthropic, mock, openrouter, ollama/,
    );
  });

  it("rejects malformed optional fields", async () => {
    const malformed = [
      ["apiKey", 42, /providers\[0\]\.apiKey must be a string/],
      ["baseUrl", true, /providers\[0\]\.baseUrl must be a string/],
      ["baseUrl", "not a URL", /providers\[0\]\.baseUrl must be a valid URL/],
      ["profile", 42, /providers\[0\]\.profile must be a string/],
      ["profile", "turbo", /providers\[0\]\.profile must be one of/],
      ["outputDir", 42, /outputDir must be a non-empty string/],
      ["outputDir", "  ", /outputDir must be a non-empty string/],
    ] as const;

    for (const [field, value, expected] of malformed) {
      configPath = join(tmpDir, `malformed-${field}-${String(value)}.json`);
      const config: Record<string, unknown> = {
        providers: [{ name: "test", providerType: "mock", model: "gpt" }],
      };
      if (field === "outputDir") config[field] = value;
      else (config.providers as Array<Record<string, unknown>>)[0][field] = value;
      writeFileSync(configPath, JSON.stringify(config));

      await assert.rejects(() => loadConfig(configPath), expected);
    }
  });

  it("rejects invalid config defaultRuns values", async () => {
    for (const defaultRuns of [0, -1, 1.5, null, Number.MAX_SAFE_INTEGER + 1]) {
      configPath = join(tmpDir, `invalid-runs-${String(defaultRuns)}.json`);
      writeFileSync(configPath, JSON.stringify({
        providers: [
          { name: "test", providerType: "mock", model: "gpt", apiKey: "" },
        ],
        defaultRuns,
      }));

      await assert.rejects(
        () => loadConfig(configPath),
        /Config defaultRuns must be a positive safe integer/,
      );
    }
  });

  it("rejects a non-finite config defaultRuns value", async () => {
    configPath = join(tmpDir, "infinite-runs.json");
    writeFileSync(configPath, `{
      "providers": [
        { "name": "test", "providerType": "mock", "model": "gpt", "apiKey": "" }
      ],
      "defaultRuns": 1e400
    }`);

    await assert.rejects(
      () => loadConfig(configPath),
      /Config defaultRuns must be a positive safe integer/,
    );
  });
});
