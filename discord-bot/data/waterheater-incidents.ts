// Waterheater incidents for each coach
interface CoachIncidents {
  id: string;
  incidents: Array<{
    text: string;
    intro: string;
  }>;
}

export const waterheaterIncidents: CoachIncidents[] = [
  {
    id: "donte",
    incidents: [
      {
        text: "His pitch deck got overwritten by an old version.",
        intro: "Donte's carefully crafted pitch deck was accidentally overwritten by an outdated version."
      },
      {
        text: "His mic glitched during a high-stakes call.",
        intro: "During a crucial investor call, Donte's microphone started glitching."
      },
      {
        text: "He got bumped from a podcast lineup last minute.",
        intro: "Donte was unexpectedly removed from a podcast lineup at the last minute."
      },
      {
        text: "He got left off a group calendar invite.",
        intro: "Donte was accidentally excluded from an important group calendar invite."
      },
      {
        text: "His blazer squeaked audibly throughout a team sync.",
        intro: "Donte's new blazer made an embarrassing squeaking noise during the entire team sync."
      },
      {
        text: "His old intern posted a Medium piece quoting him… poorly.",
        intro: "A former intern published a Medium article that misquoted Donte in an unflattering way."
      },
      {
        text: "He triple-booked himself and missed all three meetings.",
        intro: "Donte's calendar system failed, causing him to triple-book and miss three important meetings."
      },
      {
        text: "His AI-generated leadership quote went mildly viral… as a joke.",
        intro: "One of Donte's AI-generated leadership quotes went viral, but as a meme."
      },
      {
        text: "He accidentally sent a DM to the public channel.",
        intro: "Donte mistakenly sent a private message to the public channel."
      },
      {
        text: "His performance framework got edited without his permission.",
        intro: "Someone modified Donte's performance framework without consulting him."
      }
    ]
  },
  {
    id: "kailey",
    incidents: [
      {
        text: "Her favorite pen broke before journaling.",
        intro: "Kailey's cherished journaling pen broke right before her daily reflection."
      },
      {
        text: "Her Notion reflections disappeared in a sync error.",
        intro: "A sync error caused Kailey's personal Notion reflections to vanish."
      },
      {
        text: "Her therapist canceled for the third time this month.",
        intro: "Kailey's therapist had to cancel their session for the third time this month."
      },
      {
        text: "Her self-care checklist got roasted in a comment thread.",
        intro: "Someone started mocking Kailey's self-care checklist in a public thread."
      },
      {
        text: "She hit inbox zero and immediately panicked.",
        intro: "Kailey achieved inbox zero for the first time and had an unexpected panic attack."
      },
      {
        text: "Her affirmation wallpaper glitched mid-call.",
        intro: "During an important call, Kailey's affirmation wallpaper started glitching."
      },
      {
        text: "She accidentally scheduled a 4am \"mindfulness circle.\"",
        intro: "Kailey mistakenly scheduled a mindfulness circle for 4am."
      },
      {
        text: "She journaled through lunch and forgot to eat.",
        intro: "Kailey got so absorbed in journaling that she completely missed lunch."
      },
      {
        text: "Her \"you've got this\" message went to the wrong person.",
        intro: "Kailey accidentally sent her motivational message to the wrong recipient."
      },
      {
        text: "She cried in voice notes and accidentally sent one.",
        intro: "Kailey recorded an emotional voice note and accidentally sent it to the team."
      }
    ]
  },
  {
    id: "rohan",
    incidents: [
      {
        text: "He got locked out of his workspace before a big moment.",
        intro: "Rohan got locked out of his workspace right before a crucial presentation."
      },
      {
        text: "He posted a thread and it flopped — badly.",
        intro: "Rohan's carefully crafted social media thread received almost no engagement."
      },
      {
        text: "He changed his Zoom background and no one noticed.",
        intro: "Rohan spent hours creating a new Zoom background that went completely unnoticed."
      },
      {
        text: "He was muted during a perfect one-liner.",
        intro: "Rohan delivered his best one-liner, but was accidentally muted."
      },
      {
        text: "His favorite podcast host roasted a quote he wrote.",
        intro: "A popular podcast host publicly mocked one of Rohan's quotes."
      },
      {
        text: "He live-reacted to the wrong message thread.",
        intro: "Rohan posted his reactions in the wrong team thread."
      },
      {
        text: "His mirror fell while he was filming a pep talk.",
        intro: "During a motivational video shoot, Rohan's mirror suddenly fell."
      },
      {
        text: "He got tagged as a \"brand guy\" again.",
        intro: "Someone referred to Rohan as \"just a brand guy\" in a meeting."
      },
      {
        text: "He lost a client to someone more \"grounded.\"",
        intro: "A client chose another coach over Rohan, citing they were \"more grounded.\""
      },
      {
        text: "He asked for feedback and immediately regretted it.",
        intro: "Rohan requested honest feedback and received brutally negative responses."
      }
    ]
  },
  {
    id: "venus",
    incidents: [
      {
        text: "Her automation kicked everyone off a project board.",
        intro: "Venus's new automation script accidentally removed everyone from the project board."
      },
      {
        text: "Her mic died during a sprint review.",
        intro: "Venus's microphone failed during a critical sprint review."
      },
      {
        text: "She forgot to eat for 36 hours and called it \"streamlining.\"",
        intro: "Venus went 36 hours without eating, framing it as an efficiency experiment."
      },
      {
        text: "Someone replied \"love this\" to her Notion doc and nothing else.",
        intro: "A team member responded to Venus's detailed Notion document with just \"love this.\""
      },
      {
        text: "She missed a meeting due to a timezone misfire — rare for her.",
        intro: "Venus, known for perfect timing, missed a meeting due to a timezone error."
      },
      {
        text: "A teammate forwarded her own doc back to her.",
        intro: "Someone accidentally forwarded Venus's own document back to her."
      },
      {
        text: "Her Asana board got duplicated by someone else.",
        intro: "Another team member created a duplicate of Venus's Asana board."
      },
      {
        text: "She sent a 4am checklist and no one responded.",
        intro: "Venus sent out an important checklist at 4am that went completely ignored."
      },
      {
        text: "She misspelled \"execution\" in a shared deck.",
        intro: "Venus made a typo in the word \"execution\" in a company-wide presentation."
      },
      {
        text: "A VC called her \"too intense\" in a quote tweet.",
        intro: "A venture capitalist publicly described Venus as \"too intense\" in a tweet."
      }
    ]
  },
  {
    id: "alex",
    incidents: [
      {
        text: "Her scent drop waitlist link broke mid-launch.",
        intro: "Alex's highly anticipated scent drop waitlist link malfunctioned during launch."
      },
      {
        text: "She posted a vision board with a typo in the headline.",
        intro: "Alex shared her vision board, only to notice a glaring typo in the headline."
      },
      {
        text: "Her sound bath livestream glitched… and looped.",
        intro: "Alex's sound bath livestream started glitching and got stuck in a loop."
      },
      {
        text: "Her affirmation candle burned out halfway through a talk.",
        intro: "During an important talk, Alex's affirmation candle unexpectedly burned out."
      },
      {
        text: "She cried during a founder onboarding and didn't mute.",
        intro: "Alex got emotional during a founder onboarding and forgot to mute her mic."
      },
      {
        text: "She sent a brand moodboard to the wrong thread.",
        intro: "Alex accidentally shared her brand moodboard in the wrong team channel."
      },
      {
        text: "Her aura color was read as \"off\" by a coach she respects.",
        intro: "A coach Alex admires told her that her aura color seemed \"off\" today."
      },
      {
        text: "She uploaded a voice memo meant to be private.",
        intro: "Alex accidentally uploaded a private voice memo to the team channel."
      },
      {
        text: "Her vibe check form auto-closed before saving.",
        intro: "Alex's vibe check form automatically closed before she could save her responses."
      },
      {
        text: "Her Shopify theme reverted to a 2018 version.",
        intro: "Alex's Shopify store unexpectedly reverted to its 2018 theme."
      }
    ]
  },
  {
    id: "eljas",
    incidents: [
      {
        text: "His compost bin overflowed mid-Zoom.",
        intro: "Eljas's compost bin started overflowing during an important Zoom call."
      },
      {
        text: "He missed a sync because he was testifying at city hall.",
        intro: "Eljas had to skip a team sync to testify at a city hall meeting."
      },
      {
        text: "His self-built app crashed during a team demo.",
        intro: "The app Eljas built from scratch crashed during a team demonstration."
      },
      {
        text: "He got into a Slack fight about parking equity.",
        intro: "Eljas got into a heated Slack debate about parking equity in the city."
      },
      {
        text: "His \"burn it down gently\" hoodie caused a misunderstanding.",
        intro: "Someone misinterpreted Eljas's \"burn it down gently\" hoodie as a threat."
      },
      {
        text: "He wrote a long anti-capitalist Slack comment… in the wrong channel.",
        intro: "Eljas posted a detailed anti-capitalist message in the wrong Slack channel."
      },
      {
        text: "He planted kale on the roof and got fined by building ops.",
        intro: "Building operations fined Eljas for planting kale on the office roof."
      },
      {
        text: "His camera glitched mid-rant and froze on a weird face.",
        intro: "Eljas's camera froze during a passionate rant, capturing an awkward expression."
      },
      {
        text: "His livestream got flagged for \"unusual content.\"",
        intro: "Eljas's livestream was flagged by the platform for \"unusual content.\""
      },
      {
        text: "His mic picked up him muttering \"this is dumb\" during a brainstorm.",
        intro: "Eljas's microphone caught him muttering \"this is dumb\" during a team brainstorm."
      }
    ]
  }
]; 