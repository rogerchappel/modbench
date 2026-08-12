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
const exampleConfigPath = path.resolve(__dirname, '..', 'examples', 'basic-benchmark.json');

function runCli(args: string[], cwd = path.resolve(__dirname, '..')) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

const resultFixture = {
  fixtureName: 'greeting', provider: 'mock', model: 'mock-gpt', prompt: 'Hi',
  response: 'Hello', metrics: { timeToFirstTokenMs: 1, totalLatencyMs: 2,
    streamingLatencyMs: 1, tokensPerSecond: 10, tokenCount: 1 },
  runNumber: 1, timestamp: '2026-01-01T00:00:00.000Z',
};

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

  it('uses config defaultRuns when --runs is omitted', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-default-runs-'));
    const output = path.join(dir, 'results.json');

    try {
      const result = runCli(['run', '--config', exampleConfigPath, '--out', output]);
      assert.equal(result.status, 0, result.stderr);
      const results = JSON.parse(readFileSync(output, 'utf8')) as Array<{
        fixtureName: string;
        runNumber: number;
      }>;
      assert.equal(results.length, 25);
      for (const fixtureName of new Set(results.map((entry) => entry.fixtureName))) {
        assert.deepEqual(
          results.filter((entry) => entry.fixtureName === fixtureName).map((entry) => entry.runNumber),
          [1, 2, 3, 4, 5],
        );
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('prefers explicit --runs over config defaultRuns', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-override-runs-'));
    const output = path.join(dir, 'results.json');

    try {
      const result = runCli([
        'run', '--config', exampleConfigPath, '--runs', '2', '--out', output,
      ]);
      assert.equal(result.status, 0, result.stderr);
      const results = JSON.parse(readFileSync(output, 'utf8')) as Array<{ runNumber: number }>;
      assert.equal(results.length, 10);
      assert.deepEqual([...new Set(results.map((entry) => entry.runNumber))], [1, 2]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('persists example config results under outputDir', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-config-output-'));
    const output = path.join(dir, 'results', 'results.json');

    try {
      const result = runCli([
        'run', '--config', exampleConfigPath, '--fixture', 'greeting', '--runs', '1',
      ], dir);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(existsSync(output), true);
      const results = JSON.parse(readFileSync(output, 'utf8')) as unknown[];
      assert.equal(results.length, 1);
      assert.match(result.stdout, /Wrote 1 result to results[/\\]results\.json/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('prefers --out over config outputDir', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-output-override-'));
    const output = path.join(dir, 'explicit', 'benchmark.json');

    try {
      const result = runCli([
        'run', '--config', exampleConfigPath, '--fixture', 'greeting', '--runs', '1',
        '--out', output,
      ], dir);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(existsSync(output), true);
      assert.equal(existsSync(path.join(dir, 'results', 'results.json')), false);
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
    const output = path.join(dir, 'nested', 'results.json');

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

  it('reports valid array and wrapper result documents', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-report-shapes-'));
    try {
      for (const [name, document] of [
        ['array.json', [resultFixture]],
        ['wrapper.json', { results: [resultFixture] }],
      ] as const) {
        const file = path.join(dir, name);
        writeFileSync(file, JSON.stringify(document));
        const result = runCli(['report', '--file', file]);
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /Total runs: 1/);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects unreadable and malformed report documents with precise diagnostics', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-invalid-report-'));
    const cases: Array<[string, string | undefined, RegExp]> = [
      ['missing.json', undefined, /could not read file/],
      ['invalid.json', '{', /invalid JSON/],
      ['shape.json', JSON.stringify({ foo: 1 }), /expected a result array or an object with a "results" array/],
      ['empty.json', JSON.stringify({ results: [] }), /results array is empty/],
      ['invalid-result.json', JSON.stringify([{ provider: 'mock' }]), /result at index 0 must have a string "fixtureName" field/],
    ];
    try {
      for (const [name, contents, diagnostic] of cases) {
        const file = path.join(dir, name);
        if (contents !== undefined) writeFileSync(file, contents);
        const result = runCli(['report', '--file', file]);
        assert.notEqual(result.status, 0, name);
        assert.match(result.stderr, diagnostic, name);
        assert.equal(result.stdout, '', name);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not emit a partial comparison when any input is invalid', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-partial-compare-'));
    const valid = path.join(dir, 'valid.json');
    const invalid = path.join(dir, 'invalid.json');
    writeFileSync(valid, JSON.stringify([resultFixture]));
    writeFileSync(invalid, JSON.stringify({ results: [] }));
    try {
      for (const badFile of [invalid, path.join(dir, 'missing.json')]) {
        const result = runCli(['compare', '--file', valid, '--file', badFile]);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /results array is empty|could not read file/);
        assert.doesNotMatch(result.stdout, /Cross-Provider Comparison/);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects unknown flags and invalid or missing values', () => {
    for (const args of [
      ['run', '--wat'],
      ['run', '--mock', '--runs', 'zero'],
      ['run', '--mock', '--runs', '0'],
      ['run', '--mock', '--runs', '-1'],
      ['run', '--mock', '--runs', '1.5'],
      ['run', '--mock', '--runs', '9007199254740992'],
      ['run', '--mock', '--out'],
      ['fixtures', '--extra'],
      ['report', '--file'],
    ]) {
      const result = runCli(args);
      assert.notEqual(result.status, 0, args.join(' '));
      assert.match(result.stderr, /Unknown option|requires a value|positive safe integer|Usage:/);
    }
  });

  it('rejects invalid --runs before creating configured providers', () => {
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

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /CLI --runs must be a positive safe integer/);
      for (const provider of providers) {
        assert.doesNotMatch(result.stdout, new RegExp(`Benchmarking: ${provider.name}`));
      }
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  });

  it('rejects malformed config before creating configured providers', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-malformed-config-'));
    const cases = [
      [{ name: '', providerType: 'mock', model: 'test-model' }, /providers\[0\]\.name/],
      [{ name: 'unsupported', providerType: 'bogus', model: 'test-model' }, /providers\[0\]\.providerType/],
      [{ name: 'bad-profile', providerType: 'mock', model: 'test-model', profile: 'turbo' }, /providers\[0\]\.profile/],
    ] as const;

    try {
      for (const [provider, expected] of cases) {
        const config = path.join(dir, `${provider.name || 'empty'}.json`);
        writeFileSync(config, JSON.stringify({ providers: [provider] }));
        const result = runCli(['run', '--config', config, '--fixture', 'greeting'], dir);

        assert.notEqual(result.status, 0);
        assert.match(result.stderr, expected);
        assert.doesNotMatch(result.stdout, /Benchmarking:/);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects live-provider options in mock mode before fixtures or output side effects', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'modbench-incompatible-options-'));
    const missingFixture = path.join(dir, 'missing-fixtures.json');

    try {
      for (const incompatibleOption of ['--provider', '--config']) {
        const output = path.join(dir, `${incompatibleOption.slice(2)}.json`);
        const result = runCli([
          'run', '--mock', incompatibleOption, 'ignored-value',
          '--fixture-file', missingFixture, '--out', output,
        ], dir);

        assert.notEqual(result.status, 0, incompatibleOption);
        assert.match(
          result.stderr,
          new RegExp(`--mock cannot be used with ${incompatibleOption}`),
          incompatibleOption,
        );
        assert.doesNotMatch(result.stderr, /missing-fixtures/);
        assert.doesNotMatch(result.stdout, /Running benchmarks|modbench Results/);
        assert.equal(existsSync(output), false);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fixtures command lists available fixtures', () => {
    const result = runCli(['fixtures']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Available benchmark fixtures/);
  });
});
