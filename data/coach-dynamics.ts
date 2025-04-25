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

export const coachState: { [coachId: string]: CoachState } = {
  "sam": {
    emotionalTone: "optimistic",
    flags: {
      "seekingInvestment": true,
      "recentSuccess": false,
      "networkExpansion": true
    },
    relationalTilt: {
      "alex": 0.8,
      "jordan": 0.6,
      "taylor": 0.4
    }
  },
  "alex": {
    emotionalTone: "analytical",
    flags: {
      "marketResearch": true,
      "competitorAnalysis": true,
      "productLaunch": false
    },
    relationalTilt: {
      "sam": 0.8,
      "jordan": 0.7,
      "taylor": 0.5
    }
  },
  "jordan": {
    emotionalTone: "strategic",
    flags: {
      "teamBuilding": true,
      "scalingChallenges": true,
      "industryTrends": false
    },
    relationalTilt: {
      "sam": 0.6,
      "alex": 0.7,
      "taylor": 0.9
    }
  },
  "taylor": {
    emotionalTone: "innovative",
    flags: {
      "techInnovation": true,
      "sustainabilityGoals": true,
      "globalExpansion": true
    },
    relationalTilt: {
      "sam": 0.4,
      "alex": 0.5,
      "jordan": 0.9
    }
  }
};
