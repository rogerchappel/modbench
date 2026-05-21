import { describe, it } from "node:test";
import assert from "node:assert";

// Import all providers to trigger their registerProvider() side-effects
import "../providers/mock.js";
import "../providers/openai.js";
import "../providers/anthropic.js";
import "../providers/openrouter.js";
import "../providers/ollama.js";

import { providerRegistry, createProvider } from "./provider.js";

describe("ProviderRegistry", () => {
  it("has mock provider registered", () => {
    assert.ok(providerRegistry.has("mock"));
  });

  it("has openai provider registered", () => {
    assert.ok(providerRegistry.has("openai"));
  });

  it("has anthropic provider registered", () => {
    assert.ok(providerRegistry.has("anthropic"));
  });

  it("has openrouter provider registered", () => {
    assert.ok(providerRegistry.has("openrouter"));
  });

  it("has ollama provider registered", () => {
    assert.ok(providerRegistry.has("ollama"));
  });

  it("createProvider instantiates mock provider", () => {
    const p = createProvider({
      name: "test",
      providerType: "mock",
      model: "test-model",
      apiKey: "",
    });
    assert.strictEqual(p.name, "test"); // uses config.name
    assert.strictEqual(p.model, "test-model");
  });

  it("createProvider throws for unknown provider type", () => {
    assert.throws(
      () =>
        createProvider({
          name: "bad",
          providerType: "unknown" as any,
          model: "test",
          apiKey: "",
        }),
      /Unknown provider type/
    );
  });
});
