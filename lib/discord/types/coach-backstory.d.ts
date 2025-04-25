export interface CoachBackstory {
  themes: string[];
  preferredTimes?: [number, number][];
  preferredLocations?: string[];
}

export const coachBackstory: Record<string, CoachBackstory>; 