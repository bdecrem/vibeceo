// Types for coach state and dynamics
export interface CoachState {
  emotionalTone: string;
  flags: {
    [key: string]: boolean;
  };
  relationalTilt: {
    [coachId: string]: number;
  };
}

// Types for scene-specific coach state
export interface SceneCoachState {
  emotionalTone: string;
  activeFlags: string[];
  relationships: Record<string, number>;
}

// Types for coach backstory
export interface CoachBackstory {
  birthday: string;
  pets: string[];
  relationshipStatus: string;
  hobbies: string[];
  privateRitual: string;
  arcAnchor: string;
  themes: string[];
  preferredTimes?: [number, number][];
  preferredLocations?: string[];
}

declare module '../../data/coach-dynamics' {
  export { CoachState };
  export const coachState: { [coachId: string]: CoachState };
}

declare module '../../data/coach-backstory' {
  export { CoachBackstory };
  export const coachBackstory: { [coachId: string]: CoachBackstory };
} 