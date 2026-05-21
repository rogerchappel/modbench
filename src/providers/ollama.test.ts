import { describe, it } from "node:test";
import assert from "node:assert";
import { OllamaProvider } from "./ollama.js";
import type { ProviderConfig } from "../core/types.js";

const baseConfig: ProviderConfig = {
  name: "ollama",
  providerType: "ollama",
  model: "llama3.2",
  apiKey: "",
};

describe("OllamaProvider", () => {
  it("instantiates with default baseUrl", () => {
    const p = new OllamaProvider(baseConfig);
    assert.strictEqual(p.name, "ollama");
    assert.strictEqual(p.model, "llama3.2");
  });

  it("uses custom model from config", () => {
    const p = new OllamaProvider({ ...baseConfig, model: "mistral" });
    assert.strictEqual(p.model, "mistral");
  });

  it("accepts custom baseUrl", () => {
    const p = new OllamaProvider({
      ...baseConfig,
      baseUrl: "http://192.168.1.50:11434",
    });
    assert.ok(p);
  });

  it("rejects when Ollama is not running", async () => {
    const p = new OllamaProvider({ ...baseConfig, baseUrl: "http://localhost:19999" });
    try {
      await p.complete("hello");
      assert.fail("Expected rejection");
    } catch (err: any) {
      // AggregateError wraps the ECONNREFUSED - check stringified form
      const msg = JSON.stringify(err);
      assert.ok(
        msg.includes("ECONNREFUSED") || msg.includes("connect"),
        `Expected connection error but got: ${err.message || err}`
      );
    }
  });
});
