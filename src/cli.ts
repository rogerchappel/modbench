#!/usr/bin/env node

/**
 * modbench - CLI entry point
 */

import type { BenchmarkResult } from './core/types.js';
const BENCHMARK_VERSION = '0.1.0';

function printHelp(): void {
  console.log(`
modbench v${BENCHMARK_VERSION} - LLM provider benchmarking CLI

Usage:
  modbench run [--mock] [--provider <name>] [--runs <n>] [--fixture <name>]
  modbench fixtures
  modbench report [--file <path>]
  modbench compare --files <path1> <path2>

Options:
  --mock         Use mock provider (offline, deterministic)
  --provider     Provider name from config
  --runs         Number of runs per fixture (default: 3)
  --fixture      Specific fixture name to run
  --out          Output file for results (default: stdout)

Examples:
  modbench run --mock
  modbench run --provider openai --runs 5
  modbench fixtures
  modbench report --file results/bench-2024.json
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

function parseArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

async function runCommand(args: string[]): Promise<void> {
  const mockMode = args.includes('--mock');
  const targetProvider = parseArg(args, '--provider');
  const runs = parseInt(parseArg(args, '--runs') || '3', 10);
  const fixtureFilter = parseArg(args, '--fixture');

  if (mockMode) {
    console.log('Running benchmarks with mock provider...\n');

    const { loadFixtures } = await import('./core/fixtures.js');
    const { BenchmarkRunner } = await import('./core/runner.js');
    const { MockProvider } = await import('./providers/mock.js');

    const fixtures = await loadFixtures();
    const filteredFixtures = fixtureFilter
      ? fixtures.filter((f) => f.name === fixtureFilter)
      : fixtures;

    if (filteredFixtures.length === 0) {
      console.error('No fixtures found.');
      process.exit(1);
    }

    const provider = new MockProvider({
      name: 'mock',
      providerType: 'mock',
      model: 'mock-gpt',
      apiKey: '',
      profile: 'default',
    });

    const runner = new BenchmarkRunner(provider);
    const results = await runner.runMany(filteredFixtures, { runs });

    const { formatMarkdown } = await import('./output/formatters.js');
    console.log(formatMarkdown(results));
  } else {
    console.log('Running benchmarks with live providers...');
    const { loadConfig } = await import('./config/loader.js');

    let config: import('./core/types.js').BenchmarkConfig;
    try {
      config = await loadConfig();
    } catch {
      console.error(
        'No .modbench.json config found. Use --mock for offline testing, or create a config file.',
      );
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
    const { loadFixtures } = await import('./core/fixtures.js');
    const { BenchmarkRunner } = await import('./core/runner.js');

    const fixtures = await loadFixtures();
    const filteredFixtures = fixtureFilter
      ? fixtures.filter((f) => f.name === fixtureFilter)
      : fixtures;

    const allResults: BenchmarkResult[] = [];

    for (const pc of providers) {
      console.log(`\nBenchmarking: ${pc.name} (${pc.model})...`);
      const p = createProvider(pc);
      const runner = new BenchmarkRunner(p);
      const results = await runner.runMany(filteredFixtures, { runs });
      allResults.push(...results);
    }

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
  const file = parseArg(args, '--file');

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
  const filesArg = parseArg(args, '--files');

  const fileArgs = args.filter((a, i) => a === '--files' && args[i + 1])
    .flatMap((_, i) => {
      const vals: string[] = [];
      // Grab all args after --files that aren't flags
      const idx = args.indexOf('--files');
      if (idx >= 0) {
        for (let j = idx + 1; j < args.length; j++) {
          if (args[j].startsWith('--')) break;
          vals.push(args[j]);
        }
      }
      return vals;
    });

  const files = filesArg ? filesArg.split(' ') : fileArgs;
  if (files.length < 2) {
    console.error('Usage: modbench compare --files <path1> <path2>');
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
  await import('./providers/mock.js');

  const command = args[0];

  switch (command) {
    case 'run':
      await runCommand(args.slice(1));
      break;
    case 'fixtures':
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
