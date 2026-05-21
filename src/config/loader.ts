/**
 * modbench - Config loader
 * Parses .modbench.json configuration file.
 */

import type { BenchmarkConfig } from '../core/types.js';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_CONFIG_FILENAME = '.modbench.json';

export async function findConfigPath(
  startDir: string = process.cwd(),
): Promise<string> {
  let current = startDir;

  while (true) {
    const candidate = resolve(current, DEFAULT_CONFIG_FILENAME);
    try {
      await access(candidate);
      return candidate;
    } catch {
      const parent = resolve(current, '..');
      if (parent === current) break;
      current = parent;
    }
  }

  throw new Error(
    `Could not find ${DEFAULT_CONFIG_FILENAME} in ${startDir} or any parent directory`,
  );
}

export async function loadConfig(
  path?: string,
): Promise<BenchmarkConfig> {
  const configPath = path || (await findConfigPath());
  const raw = await readFile(configPath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in config file: ${configPath}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Config file must be a JSON object');
  }

  const config = parsed as Record<string, unknown>;

  if (!Array.isArray(config.providers)) {
    throw new Error('Config must have a "providers" array');
  }

  for (const p of config.providers) {
    if (typeof p !== 'object' || p === null) {
      throw new Error('Each provider must be an object');
    }
    const provider = p as Record<string, unknown>;
    if (typeof provider.name !== 'string') {
      throw new Error('Each provider must have a "name" string');
    }
    if (typeof provider.providerType !== 'string') {
      throw new Error('Each provider must have a "providerType" string');
    }
    if (typeof provider.model !== 'string') {
      throw new Error('Each provider must have a "model" string');
    }
  }

  return {
    providers: config.providers as BenchmarkConfig['providers'],
    defaultRuns: typeof config.defaultRuns === 'number' ? config.defaultRuns : 3,
    outputDir: typeof config.outputDir === 'string' ? config.outputDir : undefined,
  };
}
