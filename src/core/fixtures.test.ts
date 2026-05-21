import { describe, it } from "node:test";
import assert from "node:assert";
import { loadFixtures, getFixtureByName } from "./fixtures.js";

describe("fixtures", () => {
  it("returns bundled fixtures when no custom fixtures exist", async () => {
    const fixtures = await loadFixtures();
    assert.ok(fixtures.length >= 5);
  });

  it("bundled fixtures have required fields", async () => {
    const fixtures = await loadFixtures();
    for (const fixture of fixtures) {
      assert.ok(fixture.name, "fixture must have a name");
      assert.ok(fixture.prompt, "fixture must have a prompt");
      assert.ok(fixture.category, "fixture must have a category");
    }
  });

  it("getFixtureByName returns matching fixture", async () => {
    const fixtures = await loadFixtures();
    const greeting = getFixtureByName(fixtures, "greeting");
    assert.ok(greeting);
    assert.strictEqual(greeting.name, "greeting");
  });

  it("getFixtureByName returns undefined for missing name", async () => {
    const fixtures = await loadFixtures();
    const found = getFixtureByName(fixtures, "nonexistent-fixture-xyz");
    assert.strictEqual(found, undefined);
  });

  it("bundled fixtures include code and reasoning categories", async () => {
    const fixtures = await loadFixtures();
    const names = fixtures.map(f => f.name);
    assert.ok(names.includes("code"), "should include code fixture");
    assert.ok(names.includes("reasoning"), "should include reasoning fixture");
  });

  it("bundled fixtures span multiple categories", async () => {
    const fixtures = await loadFixtures();
    const categories = new Set(fixtures.map(f => f.category));
    assert.ok(categories.size >= 4, "should have at least 4 categories");
  });
});
