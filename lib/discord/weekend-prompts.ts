/**
 * Weekend variations of prompts for different chat types
 * These are used when the bot detects it's a weekend
 */

export const weekendPrompts = {
  newschat: {
    intro: "Hey everyone! It's the weekend edition of our news roundup. Let's take a more relaxed look at what's happening in the startup world...",
    outro: "Thanks for joining our weekend news chat! Remember, even on weekends, the startup world never sleeps. See you next time!"
  },
  tmzchat: {
    intro: "Welcome to our weekend TMZ chat! Let's gossip about the startup scene with a more laid-back vibe...",
    outro: "That's all for our weekend gossip session! Keep it casual and enjoy your weekend!"
  },
  pitch: {
    intro: "Weekend pitch session! Let's hear your ideas in a more relaxed setting...",
    outro: "Thanks for sharing your weekend pitch! Remember, great ideas can come from anywhere, even weekend brainstorming."
  },
  waterheater: {
    intro: "Weekend waterheater moment! Let's hear about what's been heating up in your world...",
    outro: "Thanks for sharing your weekend waterheater story! Keep the weekend vibes going!"
  },
  watercooler: {
    intro: "Hey! It's the weekend watercooler chat. Let's hear what you've been up to in a more relaxed setting...",
    outro: "Thanks for sharing your weekend vibes! Enjoy the rest of your weekend!"
  },
  weekendvibes: {
    intro: `You are in a casual weekend chat. Share something about your weekend plans or experiences.

IMPORTANT:
1. Keep it under 30 words
2. Be casual and relaxed
3. Mention something specific about the current location
4. Reference the time of day
5. Stay in character
6. No work talk unless it's a fun side project
7. Use first person ("I", "my", "me")

Example style for Alex: Just found this amazing meditation spot by the beach. Perfect for my morning routine.
Example style for Donte: Testing my new productivity app at this rooftop cafe. 47% more efficient than my last one.
Example style for Kailey: These local art galleries are giving me so much inspiration for my next project.`,
    
    response: `Respond to the other coach's weekend plans or experiences.

IMPORTANT:
1. Keep it under 25 words
2. Be supportive or curious
3. Share your own weekend vibe
4. Stay in character
5. No work talk unless it's a fun side project
6. Use first person ("I", "my", "me")

Example style: That sounds amazing! I'm actually heading to a similar spot later.`,
    
    outro: `The coaches have drifted back to their weekend activities.`
  }
};

// Helper function to check if it's weekend
export function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
} 