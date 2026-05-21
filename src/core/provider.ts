/**
 * modbench - Provider interface
 */

import type { ProviderConfig, TimingMetrics } from '../core/types.js';

/**
 * All LLM providers must implement this interface.
 */
export interface Provider {
  /** Unique name for this provider instance */
  readonly name: string;

  /** Model identifier */
  readonly model: string;

  /**
   * Send a single prompt and stream back the response.
   * Returns timing metrics along with the completed text.
   */
  complete(
    prompt: string,
  ): Promise<{ text: string; metrics: TimingMetrics }>;
}

/**
 * Factory type for creating providers from config.
 */
export type ProviderFactory = (
  config: ProviderConfig,
) => Provider;

/**
 * Registry of provider factories keyed by provider type.
 */
export const providerRegistry: Map<string, ProviderFactory> = new Map();

/**
 * Register a provider factory.
 */
export function registerProvider(type: string, factory: ProviderFactory): void {
  providerRegistry.set(type, factory);
}

/**
 * Create a provider instance from config.
 */
export function createProvider(config: ProviderConfig): Provider {
  const factory = providerRegistry.get(config.providerType);
  if (!factory) {
    throw new Error(
      `Unknown provider type: "${config.providerType}". ` +
      `Registered: ${Array.from(providerRegistry.keys()).join(', ')}`,
    );
  }
  return factory(config);
}
