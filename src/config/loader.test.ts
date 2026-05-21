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
});
