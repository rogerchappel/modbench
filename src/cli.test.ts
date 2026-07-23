import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, 'cli.js');
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');

function runCli(args: string[], cwd = path.resolve(__dirname, '..')) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

describe('CLI', () => {
  it('help flag prints usage information', () => {
    const result = runCli(['--help']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /modbench run --mock/);
    assert.equal(result.stderr, '');
  });

  it('version flag prints package version', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version: string };
    const result = runCli(['--version']);

    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), packageJson.version);
    assert.equal(result.stderr, '');
  });

  it('run command accepts --mock flag', () => {
    const result = runCli(['run', '--mock', '--runs', '1']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Running benchmarks with mock provider/);
    assert.match(result.stdout, /modbench Results/);
  });

  it('runs with an explicit config file', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-config-'));
    const config = path.join(dir, 'benchmark.json');
    writeFileSync(config, JSON.stringify({
      providers: [{ name: 'local', providerType: 'mock', model: 'mock-gpt', apiKey: '' }],
    }));

    try {
      const result = runCli(['run', '--config', config, '--runs', '1'], dir);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Benchmarking: local/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('runs only fixtures from an explicit fixture file', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-fixtures-'));
    const fixtureFile = path.join(dir, 'fixtures.json');
    writeFileSync(fixtureFile, JSON.stringify([
      { name: 'custom', description: 'Custom prompt', prompt: 'Say hello.' },
    ]));

    try {
      const result = runCli(['run', '--mock', '--fixture-file', fixtureFile, '--runs', '1']);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /custom/);
      assert.doesNotMatch(result.stdout, /greeting/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes JSON results to --out', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-output-'));
    const output = path.join(dir, 'results.json');

    try {
      const result = runCli(['run', '--mock', '--fixture', 'greeting', '--runs', '1', '--out', output]);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(existsSync(output), true);
      const results = JSON.parse(readFileSync(output, 'utf8')) as unknown[];
      assert.equal(results.length, 1);
      assert.match(result.stdout, /Wrote 1 result/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('compares repeated --file arguments', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-compare-'));
    const resultFixture = {
      fixtureName: 'greeting', provider: 'mock', model: 'mock-gpt', prompt: 'Hi',
      response: 'Hello', metrics: { timeToFirstTokenMs: 1, totalLatencyMs: 2,
        streamingLatencyMs: 1, tokensPerSecond: 10, tokenCount: 1 },
      runNumber: 1, timestamp: '2026-01-01T00:00:00.000Z',
    };
    const before = path.join(dir, 'before.json');
    const after = path.join(dir, 'after.json');
    writeFileSync(before, JSON.stringify([resultFixture]));
    writeFileSync(after, JSON.stringify([resultFixture]));

    try {
      const result = runCli(['compare', '--file', before, '--file', after]);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Cross-Provider Comparison/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects unknown flags and invalid or missing values', () => {
    for (const args of [
      ['run', '--wat'],
      ['run', '--mock', '--runs', 'zero'],
      ['run', '--mock', '--runs', '-1'],
      ['run', '--mock', '--out'],
      ['fixtures', '--extra'],
      ['report', '--file'],
    ]) {
      const result = runCli(args);
      assert.notEqual(result.status, 0, args.join(' '));
      assert.match(result.stderr, /Unknown option|requires a value|non-negative integer|Usage:/);
    }
  });

  it('run command creates every configured provider type without making requests', () => {
    const configDir = mkdtempSync(path.join(tmpdir(), 'modbench-cli-'));
    const providers = ['openai', 'anthropic', 'openrouter', 'ollama', 'mock'].map(
      (providerType) => ({
        name: `configured-${providerType}`,
        providerType,
        model: 'test-model',
        apiKey: 'test-key',
      }),
    );

    try {
      writeFileSync(path.join(configDir, '.modbench.json'), JSON.stringify({ providers }));
      const result = runCli(['run', '--runs', '0'], configDir);

      assert.equal(result.status, 0, result.stderr);
      for (const provider of providers) {
        assert.match(result.stdout, new RegExp(`Benchmarking: ${provider.name} \\(test-model\\)`));
      }
      assert.equal(result.stderr, '');
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  });

  it('fixtures command lists available fixtures', () => {
    const result = runCli(['fixtures']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Available benchmark fixtures/);
  });
});
