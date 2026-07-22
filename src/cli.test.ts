import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
