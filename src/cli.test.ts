import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, 'cli.js');
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');

function runCli(args: string[]) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: path.resolve(__dirname, '..'),
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
    assert.match(result.stdout, /Benchmark Results/);
  });

  it('fixtures command lists available fixtures', () => {
    const result = runCli(['fixtures']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Available benchmark fixtures/);
  });
});
