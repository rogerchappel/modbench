export function assertPositiveRunCount(value: number, source: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${source} must be a positive safe integer`);
  }

  return value;
}
