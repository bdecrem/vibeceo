export interface CoachState {
  emotionalTone: string;
  flags: Record<string, boolean>;
  relationalTilt: Record<string, number>;
}

export const coachState: Record<string, CoachState>; 