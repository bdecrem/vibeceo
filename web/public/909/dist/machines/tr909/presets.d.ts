import type { Pattern } from '../../core/types.js';
export interface PresetPattern {
    id: string;
    name: string;
    description: string;
    bpm: number;
    pattern: Pattern;
}
export declare const technoBasic: PresetPattern;
export declare const detroitShuffle: PresetPattern;
export declare const houseClassic: PresetPattern;
export declare const breakbeat: PresetPattern;
export declare const minimal: PresetPattern;
export declare const acidHouse: PresetPattern;
export declare const electroFunk: PresetPattern;
export declare const industrial: PresetPattern;
export declare const TR909_PRESETS: PresetPattern[];
export declare function getPreset(id: string): PresetPattern | undefined;
export declare function listPresetIds(): string[];
