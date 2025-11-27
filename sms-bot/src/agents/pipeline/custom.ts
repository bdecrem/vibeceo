/**
 * Custom Pipeline Step
 * Executes custom code steps (stub for now, future implementation)
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

interface CustomConfig {
  customStepId: string;
  config?: Record<string, any>;
}

/**
 * Execute custom step
 * TODO: Implement custom code execution with sandboxing
 */
export async function executeCustomStep(
  items: NormalizedItem[],
  config: CustomConfig
): Promise<NormalizedItem[]> {
  console.log(`     Custom step '${config.customStepId}' not yet implemented`);
  console.log(`     Skipping custom step - returning items unchanged`);

  // Future implementation:
  // 1. Load custom step code from database
  // 2. Execute in sandboxed environment (VM2 or isolated Worker)
  // 3. Validate output
  // 4. Return transformed items

  return items;
}
