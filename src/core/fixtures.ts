/**
 * modbench - Fixture loading
 * Loads benchmark fixtures from JSON and bundled defaults.
 */

import type { BenchmarkFixture } from '../core/types.js';
import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';

const bundledFixtures: BenchmarkFixture[] = [
  {
    name: 'greeting',
    description: 'Simple greeting prompt',
    prompt: 'Say hello in one sentence.',
    category: 'basic',
  },
  {
    name: 'summary',
    description: 'Summarize a paragraph',
    prompt:
      'Summarize the following in 2-3 sentences: The Industrial Revolution was a period of major industrialization and innovation during the late 1700s and early 1800s. It began in Great Britain and quickly spread throughout Western Europe and North America, eventually affecting a large part of the world. The revolution was marked by a shift from hand production methods to machines, new chemical manufacturing processes, increased use of steam and water power, and the development of machine tools.',
    category: 'summarization',
  },
  {
    name: 'code',
    description: 'Generate a simple function',
    prompt:
      'Write a TypeScript function called "fibonacci" that takes a number n and returns the nth Fibonacci number. Use iteration, not recursion.',
    category: 'code',
  },
  {
    name: 'json',
    description: 'Structured JSON output',
    prompt:
      'Return a JSON object with keys: name (string), age (number), hobbies (string array) for a fictional person. Only output valid JSON, no markdown.',
    category: 'structured',
  },
  {
    name: 'reasoning',
    description: 'Multi-step reasoning task',
    prompt:
      'If a train travels at 60 mph for 2 hours, then 45 mph for 1.5 hours, how far has it traveled in total? Show your work step by step.',
    category: 'reasoning',
  },
];

export async function loadFixtures(): Promise<BenchmarkFixture[]> {
  const bundled = [...bundledFixtures];

  // Try loading custom fixtures from fixtures/ directory
  const fixturesDir = new URL('../../fixtures/', import.meta.url);
  try {
    await stat(new URL('.', fixturesDir));
  } catch {
    return bundled;
  }

  // Read fixture files
  const { readdir } = await import('node:fs/promises');
  let files: string[];
  try {
    files = await readdir(new URL('.', fixturesDir));
  } catch {
    return bundled;
  }

  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  for (const file of jsonFiles) {
    try {
      const raw = await readFile(new URL(file, fixturesDir), 'utf-8');
      const parsed: BenchmarkFixture | BenchmarkFixture[] = JSON.parse(raw);
      const fixtures = Array.isArray(parsed) ? parsed : [parsed];
      bundled.push(...fixtures);
    } catch {
      // Skip malformed fixture files
    }
  }

  return bundled;
}

export function getFixtureByName(
  fixtures: BenchmarkFixture[],
  name: string,
): BenchmarkFixture | undefined {
  return fixtures.find((f) => f.name === name);
}
