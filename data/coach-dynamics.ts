// coach-dynamics.ts

export interface CoachState {
  emotionalTone: string;
  flags: {
    [key: string]: boolean;
  };
  relationalTilt: {
    [coachId: string]: number;
  };
}

// Create the base state
const baseCoachState: { [coachId: string]: CoachState } = {
  "donte": {
    emotionalTone: "optimistic",
    flags: {
      "seekingInvestment": true,
      "recentSuccess": false,
      "networkExpansion": true
    },
    relationalTilt: {
      "alex": 0.8,
      "venus": 0.6,
      "rohan": 0.3,
      "eljas": 0.5,
      "kailey": 0.7
    }
  },
  "eljas": {
    emotionalTone: "grounded",
    flags: {
      "sustainabilityFocus": true,
      "communityBuilding": true,
      "longTermPlanning": true
    },
    relationalTilt: {
      "kailey": 0.6,
      "rohan": 0.3,
      "venus": 0.5,
      "alex": 0.5,
      "donte": 0.4
    }
  },
  "venus": {
    emotionalTone: "analytical",
    flags: {
      "dataDriven": true,
      "riskAware": true,
      "futureFocused": true
    },
    relationalTilt: {
      "alex": 0.7,
      "kailey": 0.6,
      "donte": 0.3,
      "rohan": 0.5,
      "eljas": 0.5
    }
  },
  "alex": {
    emotionalTone: "innovative",
    flags: {
      "wellnessTech": true,
      "dataDriven": true,
      "futureFocused": true
    },
    relationalTilt: {
      "venus": 0.8,
      "donte": 0.7,
      "kailey": 0.6,
      "rohan": 0.4,
      "eljas": 0.5
    }
  },
  "rohan": {
    emotionalTone: "aggressive",
    flags: {
      "competitive": true,
      "shortTermFocus": true,
      "highStakes": true
    },
    relationalTilt: {
      "eljas": 0.3,
      "kailey": 0.3,
      "venus": 0.5,
      "donte": 0.5,
      "alex": 0.4
    }
  },
  "kailey": {
    emotionalTone: "calm",
    flags: {
      "strategicPatience": true,
      "mindfulness": true,
      "longTermFocus": true
    },
    relationalTilt: {
      "eljas": 0.8,
      "venus": 0.6,
      "alex": 0.6,
      "rohan": 0.3,
      "donte": 0.5
    }
  }
};

// Create an immutable copy
export const coachState = Object.freeze(baseCoachState);
