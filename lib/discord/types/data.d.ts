declare module '../data/coach-dynamics' {
  export interface CoachState {
    emotionalTone: string;
    flags: {
      [key: string]: boolean;
    };
    relationalTilt: {
      [coachId: string]: number;
    };
  }

  export const coachState: { [coachId: string]: CoachState };
}

declare module '../data/coach-backstory' {
  export interface CoachBackstory {
    themes: string[];
    preferredTimes?: [number, number][];
    preferredLocations?: string[];
  }

  export const coachBackstory: { [coachId: string]: CoachBackstory };
} 