// coach-dynamics.ts

export const coachState = {
  venus: {
    emotionalTone: 'neutral',
    flags: {
      fasting: false,
    },
    relationalTilt: {
      kailey: 0,
      rohan: 0,
      donte: 0,
      alex: 0,
      eljas: 0,
    }
  },

  rohan: {
    emotionalTone: 'neutral',
    flags: {
      fasting: false,
    },
    relationalTilt: {
      kailey: 0,
      venus: 0,
      donte: 0,
      alex: 0,
      eljas: 0,
    }
  },

  kailey: {
    emotionalTone: 'neutral',
    flags: {},
    relationalTilt: {
      rohan: 0,
      venus: 0,
      donte: 0,
      alex: 0,
      eljas: 0,
    }
  },

  eljas: {
    emotionalTone: 'neutral',
    flags: {},
    relationalTilt: {
      kailey: 0,
      venus: 0,
      donte: 0,
      alex: 0,
      rohan: 0,
    }
  },

  alex: {
    emotionalTone: 'neutral',
    flags: {},
    relationalTilt: {
      kailey: 0,
      venus: 0,
      donte: 0,
      rohan: 0,
      eljas: 0,
    }
  },

  donte: {
    emotionalTone: 'neutral',
    flags: {},
    relationalTilt: {
      kailey: 0,
      venus: 0,
      rohan: 0,
      alex: 0,
      eljas: 0,
    }
  }
};
