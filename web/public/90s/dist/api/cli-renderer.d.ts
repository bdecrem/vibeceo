/**
 * CLI-specific offline renderer for Node.js environments.
 * Pure JavaScript implementation - no Web Audio API required.
 */
import type { Pattern } from '../core/types.js';
export interface RenderOptions {
    bpm?: number;
    bars?: number;
    sampleRate?: number;
}
/**
 * Render a pattern to a WAV ArrayBuffer
 */
export declare function renderPatternOffline(pattern: Pattern, options?: RenderOptions): Promise<ArrayBuffer>;
