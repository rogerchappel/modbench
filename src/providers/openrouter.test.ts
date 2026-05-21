import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { OpenRouterProvider } from "./openrouter.js";
import type { ProviderConfig } from "../core/types.js";

const savedKey = process.env.OPENROUTER_API_KEY;

describe("OpenRouterProvider", () => {
  after(() => {
    if (savedKey) process.env.OPENROUTER_API_KEY = savedKey;
  });

  it("instantiates with config", () => {
    const config: ProviderConfig = {
      name: "openrouter",
      providerType: "openrouter",
      model: "meta-llama/llama-3-8b-instruct",
      apiKey: "test-key",
    };
    const p = new OpenRouterProvider(config);
    assert.strictEqual(p.name, "openrouter");
    assert.strictEqual(p.model, "meta-llama/llama-3-8b-instruct");
  });

  it("throws when no API key is available", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const config: ProviderConfig = {
      name: "openrouter",
      providerType: "openrouter",
      model: "test",
      apiKey: "",
    };
    const p = new OpenRouterProvider(config);
    await assert.rejects(() => p.complete("hello"), /API key is required/);
  });

  it("respects custom baseUrl", () => {
    const config: ProviderConfig = {
      name: "openrouter",
      providerType: "openrouter",
      model: "test",
      apiKey: "key",
      baseUrl: "https://custom.example.com/v1",
    };
    const p = new OpenRouterProvider(config);
    assert.ok(p);
  });
});
