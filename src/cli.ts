#!/usr/bin/env node

/**
 * modbench - CLI entry point
 */

import type { BenchmarkResult } from './core/types.js';
import { writeFile } from 'node:fs/promises';
const BENCHMARK_VERSION = '0.1.0';

function printHelp(): void {
  console.log(`
modbench v${BENCHMARK_VERSION} - LLM provider benchmarking CLI

Usage:
  modbench run [--mock] [--config <path>] [--provider <name>] [--runs <n>]
               [--fixture <name> | --fixture-file <path>] [--out <path>]
  modbench fixtures
  modbench report [--file <path>]
  modbench compare --file <path1> --file <path2>

Options:
  --mock         Use mock provider (offline, deterministic)
  --provider     Provider name from config
  --runs         Number of runs per fixture (default: 3)
  --fixture      Specific fixture name to run
  --fixture-file Load fixtures from a JSON file
  --config       Load provider configuration from a JSON file
  --out          Write JSON results to a file (default: Markdown on stdout)

Examples:
  modbench run --mock
  modbench run --provider openai --runs 5
  modbench run --mock --fixture-file examples/custom-fixtures.json --out results.json
  modbench fixtures
  modbench report --file results/bench-2024.json
  modbench compare --file before.json --file after.json
`);
}

function printFixtures(
  fixtures: Array<{ name: string; description: string; category?: string; prompt: string }>,
): void {
  console.log(`Available benchmark fixtures (${fixtures.length}):\n`);
  for (const f of fixtures) {
    console.log(`  ${f.name}`);
    console.log(`    ${f.description}`);
    if (f.category) console.log(`    Category: ${f.category}`);
    console.log(`    Prompt length: ${f.prompt.length} chars`);
    console.log();
  }
}

function parseOptions(
  args: string[],
  booleanOptions: Set<string>,
  valueOptions: Set<string>,
  repeatableOptions: Set<string> = new Set(),
): Map<string, string[]> {
  const parsed = new Map<string, string[]>();
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    if (!option.startsWith('--') || (!booleanOptions.has(option) && !valueOptions.has(option))) {
      throw new Error(`Unknown option: ${option}`);
    }
    if (booleanOptions.has(option)) {
      if (parsed.has(option)) throw new Error(`Option may only be specified once: ${option}`);
      parsed.set(option, []);
      continue;
    }
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Option ${option} requires a value`);
    if (parsed.has(option) && !repeatableOptions.has(option)) {
      throw new Error(`Option may only be specified once: ${option}`);
    }
    parsed.set(option, [...(parsed.get(option) ?? []), value]);
  }
  return parsed;
}

async function runCommand(args: string[]): Promise<void> {
  const options = parseOptions(
    args,
    new Set(['--mock']),
    new Set(['--provider', '--runs', '--fixture', '--fixture-file', '--config', '--out']),
  );
  const mockMode = options.has('--mock');
  const targetProvider = options.get('--provider')?.[0];
  const runsValue = options.get('--runs')?.[0] ?? '3';
  if (!/^[1-9]\d*$/.test(runsValue)) throw new Error('--runs must be a positive integer');
  const runs = Number(runsValue);
  const fixtureFilter = options.get('--fixture')?.[0];
  const fixtureFile = options.get('--fixture-file')?.[0];
  const configFile = options.get('--config')?.[0];
  const outputFile = options.get('--out')?.[0];
  if (fixtureFilter && fixtureFile) {
    throw new Error('--fixture and --fixture-file cannot be used together');
  }

  const { loadFixtures, loadFixtureFile } = await import('./core/fixtures.js');
  const fixtures = fixtureFile ? await loadFixtureFile(fixtureFile) : await loadFixtures();
  const filteredFixtures = fixtureFilter
    ? fixtures.filter((fixture) => fixture.name === fixtureFilter)
    : fixtures;
  if (filteredFixtures.length === 0) throw new Error('No fixtures found.');

  let allResults: BenchmarkResult[] = [];

  if (mockMode) {
    console.log('Running benchmarks with mock provider...\n');

    const { BenchmarkRunner } = await import('./core/runner.js');
    const { MockProvider } = await import('./providers/mock.js');

    const provider = new MockProvider({
      name: 'mock',
      providerType: 'mock',
      model: 'mock-gpt',
      apiKey: '',
      profile: 'default',
    });

    const runner = new BenchmarkRunner(provider);
    allResults = await runner.runMany(filteredFixtures, { runs });
  } else {
    console.log('Running benchmarks with live providers...');
    const { loadConfig } = await import('./config/loader.js');

    let config: import('./core/types.js').BenchmarkConfig;
    try {
      config = await loadConfig(configFile);
    } catch (error) {
      console.error(
        configFile
          ? `Could not load config from: ${configFile}`
          : 'No .modbench.json config found. Use --mock for offline testing, or create a config file.',
      );
      if (error instanceof Error) console.error(error.message);
      process.exit(1);
    }

    const providers = targetProvider
      ? config.providers.filter((p: import('./core/types.js').ProviderConfig) => p.name === targetProvider)
      : config.providers;

    if (providers.length === 0) {
      console.error('No providers found.');
      process.exit(1);
    }

    const { createProvider } = await import('./core/provider.js');
    const { BenchmarkRunner } = await import('./core/runner.js');

    for (const pc of providers) {
      console.log(`\nBenchmarking: ${pc.name} (${pc.model})...`);
      const p = createProvider(pc);
      const runner = new BenchmarkRunner(p);
      const results = await runner.runMany(filteredFixtures, { runs });
      allResults.push(...results);
    }

  }

  if (outputFile) {
    await writeFile(outputFile, `${JSON.stringify(allResults, null, 2)}\n`, 'utf8');
    console.log(`Wrote ${allResults.length} result${allResults.length === 1 ? '' : 's'} to ${outputFile}`);
  } else {
    const { formatMarkdown } = await import('./output/formatters.js');
    console.log(formatMarkdown(allResults));
  }
}

async function fixturesCommand(): Promise<void> {
  const { loadFixtures } = await import('./core/fixtures.js');
  const fixtures = await loadFixtures();
  printFixtures(fixtures);
}

async function reportCommand(args: string[]): Promise<void> {
  const file = parseOptions(args, new Set(), new Set(['--file'])).get('--file')?.[0];

  if (!file) {
    console.error('Usage: modbench report --file <path>');
    process.exit(1);
  }

  const { readFile } = await import('node:fs/promises');
  const { formatMarkdown } = await import('./output/formatters.js');

  try {
    const data = await readFile(file, 'utf-8');
    const parsed = JSON.parse(data);
    const results: BenchmarkResult[] = Array.isArray(parsed) ? parsed : (parsed.results || []);
    console.log(formatMarkdown(results));
  } catch {
    console.error(`Could not read report from: ${file}`);
    process.exit(1);
  }
}

async function compareCommand(args: string[]): Promise<void> {
  const files = parseOptions(
    args,
    new Set(),
    new Set(['--file']),
    new Set(['--file']),
  ).get('--file') ?? [];
  if (files.length < 2) {
    console.error('Usage: modbench compare --file <path1> --file <path2>');
    process.exit(1);
  }

  const { readFile } = await import('node:fs/promises');
  const { formatCompareMarkdown } = await import('./output/formatters.js');

  const allResults: BenchmarkResult[] = [];

  for (const filePath of files) {
    try {
      const data = await readFile(filePath.trim(), 'utf-8');
      const parsed = JSON.parse(data);
      const results: BenchmarkResult[] = Array.isArray(parsed) ? parsed : (parsed.results || []);
      allResults.push(...results);
    } catch {
      console.error(`Could not read: ${filePath}`);
    }
  }

  if (allResults.length === 0) {
    console.error('No results to compare.');
    process.exit(1);
  }

  console.log(formatCompareMarkdown(allResults));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log(BENCHMARK_VERSION);
    return;
  }

  // Import provider implementations to register them
  await import('./providers/openai.js');
  await import('./providers/anthropic.js');
  await import('./providers/openrouter.js');
  await import('./providers/ollama.js');
  await import('./providers/mock.js');

  const command = args[0];

  switch (command) {
    case 'run':
      await runCommand(args.slice(1));
      break;
    case 'fixtures':
      if (args.length > 1) throw new Error(`Unknown option: ${args[1]}`);
      await fixturesCommand();
      break;
    case 'report':
      await reportCommand(args.slice(1));
      break;
    case 'compare':
      await compareCommand(args.slice(1));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
