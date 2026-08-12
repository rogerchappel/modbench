/**
 * modbench - Config loader
 * Parses .modbench.json configuration file.
 */

import type { BenchmarkConfig } from '../core/types.js';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertPositiveRunCount } from '../core/run-options.js';
import { supportedProviderTypes } from '../core/provider.js';

const DEFAULT_CONFIG_FILENAME = '.modbench.json';
const MOCK_PROFILES = ['fast', 'default', 'slow', 'variable'] as const;

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function validateOptionalString(value: unknown, field: string): void {
  if (value !== undefined && typeof value !== 'string') {
    throw new Error(`${field} must be a string when provided`);
  }
}

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

  for (const [index, p] of config.providers.entries()) {
    const prefix = `providers[${index}]`;
    if (typeof p !== 'object' || p === null) {
      throw new Error(`${prefix} must be an object`);
    }
    const provider = p as Record<string, unknown>;
    requireNonEmptyString(provider.name, `${prefix}.name`);
    const providerType = requireNonEmptyString(provider.providerType, `${prefix}.providerType`);
    if (!(supportedProviderTypes as readonly string[]).includes(providerType)) {
      throw new Error(
        `${prefix}.providerType must be one of: ${supportedProviderTypes.join(', ')}; received "${providerType}"`,
      );
    }
    requireNonEmptyString(provider.model, `${prefix}.model`);
    validateOptionalString(provider.apiKey, `${prefix}.apiKey`);
    validateOptionalString(provider.baseUrl, `${prefix}.baseUrl`);
    if (typeof provider.baseUrl === 'string') {
      try {
        new URL(provider.baseUrl);
      } catch {
        throw new Error(`${prefix}.baseUrl must be a valid URL when provided`);
      }
    }
    validateOptionalString(provider.profile, `${prefix}.profile`);
    if (
      provider.profile !== undefined &&
      !(MOCK_PROFILES as readonly unknown[]).includes(provider.profile)
    ) {
      throw new Error(`${prefix}.profile must be one of: ${MOCK_PROFILES.join(', ')}`);
    }
  }

  if (config.outputDir !== undefined) {
    requireNonEmptyString(config.outputDir, 'outputDir');
  }

  const defaultRuns = config.defaultRuns === undefined
    ? 3
    : assertPositiveRunCount(
      typeof config.defaultRuns === 'number' ? config.defaultRuns : Number.NaN,
      'Config defaultRuns',
    );

  return {
    providers: config.providers as BenchmarkConfig['providers'],
    defaultRuns,
    outputDir: config.outputDir as string | undefined,
  };
}
