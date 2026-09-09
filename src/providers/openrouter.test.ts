import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import http from "node:http";
import { OpenRouterProvider } from "./openrouter.js";
import type { ProviderConfig } from "../core/types.js";

const savedKey = process.env.OPENROUTER_API_KEY;

describe("OpenRouterProvider", () => {
  after(() => {
    if (savedKey) process.env.OPENROUTER_API_KEY = savedKey;
  });

  it("instantiates with config", () => {
    const config: ProviderConfig = {
      name: "backup-router",
      providerType: "openrouter",
      model: "meta-llama/llama-3-8b-instruct",
      apiKey: "test-key",
    };
    const p = new OpenRouterProvider(config);
    assert.strictEqual(p.name, "backup-router");
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

  it("sends requests to a custom HTTP path, query, and port", async () => {
    let observedRequest: { url: string; authorization?: string } | undefined;
    const server = http.createServer((req, res) => {
      observedRequest = { url: req.url ?? '', authorization: req.headers.authorization };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: 'local response' } }], usage: { total_tokens: 2 } }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      const provider = new OpenRouterProvider({
        name: 'openrouter',
        providerType: 'openrouter',
        model: 'local-model',
        apiKey: 'local-key',
        baseUrl: `http://127.0.0.1:${address.port}/compatible/chat/completions?api-version=1`,
      });
      const result = await provider.complete('hello');
      assert.strictEqual(result.text, 'local response');
      assert.deepStrictEqual(observedRequest, {
        url: '/compatible/chat/completions?api-version=1',
        authorization: 'Bearer local-key',
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
