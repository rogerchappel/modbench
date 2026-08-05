import { readFile } from 'node:fs/promises';
import type { BenchmarkResult, TimingMetrics } from '../core/types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isTimingMetrics(value: unknown): value is TimingMetrics {
  return isRecord(value)
    && isNullableNumber(value.timeToFirstTokenMs)
    && typeof value.totalLatencyMs === 'number' && Number.isFinite(value.totalLatencyMs)
    && typeof value.streamingLatencyMs === 'number' && Number.isFinite(value.streamingLatencyMs)
    && isNullableNumber(value.tokensPerSecond)
    && isNullableNumber(value.tokenCount);
}

function invalidResultReason(value: unknown): string | undefined {
  if (!isRecord(value)) return 'must be an object';
  for (const field of ['fixtureName', 'provider', 'model', 'prompt', 'timestamp'] as const) {
    if (typeof value[field] !== 'string') return `must have a string \"${field}\" field`;
  }
  if (!(value.response === null || typeof value.response === 'string')) {
    return 'must have a string or null \"response\" field';
  }
  if (!(value.error === undefined || typeof value.error === 'string')) {
    return 'must have a string \"error\" field when present';
  }
  if (!(typeof value.runNumber === 'number' && Number.isSafeInteger(value.runNumber))) {
    return 'must have an integer \"runNumber\" field';
  }
  if (!isTimingMetrics(value.metrics)) {
    return 'must have valid numeric/null timing fields in \"metrics\"';
  }
  return undefined;
}

export function parseResultDocument(value: unknown): BenchmarkResult[] {
  let results: unknown[];
  if (Array.isArray(value)) results = value;
  else if (isRecord(value) && Array.isArray(value.results)) results = value.results;
  else throw new Error('expected a result array or an object with a \"results\" array');

  if (results.length === 0) throw new Error('results array is empty');
  for (const [index, result] of results.entries()) {
    const reason = invalidResultReason(result);
    if (reason) throw new Error(`result at index ${index} ${reason}`);
  }
  return results as BenchmarkResult[];
}

export async function loadResultDocument(filePath: string): Promise<BenchmarkResult[]> {
  let contents: string;
  try {
    contents = await readFile(filePath, 'utf-8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`could not read file (${detail})`);
  }

  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid JSON (${detail})`);
  }
  return parseResultDocument(value);
}
