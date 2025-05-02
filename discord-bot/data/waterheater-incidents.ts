// Waterheater incidents for each coach
interface CoachIncidents {
  id: string;
  incidents: string[];
}

export const waterheaterIncidents: CoachIncidents[] = [
  {
    id: 'donte',
    incidents: [
      'His pitch deck got overwritten by an old version.',
      'His mic glitched during a high-stakes call.',
      'He got bumped from a podcast lineup last minute.',
      'He got left off a group calendar invite.',
      'His blazer squeaked audibly throughout a team sync.',
      'His old intern posted a Medium piece quoting him… poorly.',
      'He triple-booked himself and missed all three meetings.',
      'His AI-generated leadership quote went mildly viral… as a joke.',
      'He accidentally sent a DM to the public channel.',
      'His performance framework got edited without his permission.'
    ]
  },
  {
    id: 'kailey',
    incidents: [
      'Her favorite pen broke before journaling.',
      'Her Notion reflections disappeared in a sync error.',
      'Her therapist canceled for the third time this month.',
      'Her self-care checklist got roasted in a comment thread.',
      'She hit inbox zero and immediately panicked.',
      'Her affirmation wallpaper glitched mid-call.',
      'She accidentally scheduled a 4am "mindfulness circle."',
      'She journaled through lunch and forgot to eat.',
      'Her "you\'ve got this" message went to the wrong person.',
      'She cried in voice notes and accidentally sent one.'
    ]
  },
  {
    id: 'rohan',
    incidents: [
      'He got locked out of his workspace before a big moment.',
      'He posted a thread and it flopped — badly.',
      'He changed his Zoom background and no one noticed.',
      'He was muted during a perfect one-liner.',
      'His favorite podcast host roasted a quote he wrote.',
      'He live-reacted to the wrong message thread.',
      'His mirror fell while he was filming a pep talk.',
      'He got tagged as a "brand guy" again.',
      'He lost a client to someone more "grounded."',
      'He asked for feedback and immediately regretted it.'
    ]
  },
  {
    id: 'venus',
    incidents: [
      'Her automation kicked everyone off a project board.',
      'Her mic died during a sprint review.',
      'She forgot to eat for 36 hours and called it "streamlining."',
      'Someone replied "love this" to her Notion doc and nothing else.',
      'She missed a meeting due to a timezone misfire — rare for her.',
      'A teammate forwarded her own doc back to her.',
      'Her Asana board got duplicated by someone else.',
      'She sent a 4am checklist and no one responded.',
      'She misspelled "execution" in a shared deck.',
      'A VC called her "too intense" in a quote tweet.'
    ]
  },
  {
    id: 'alex',
    incidents: [
      'Her scent drop waitlist link broke mid-launch.',
      'She posted a vision board with a typo in the headline.',
      'Her sound bath livestream glitched… and looped.',
      'Her affirmation candle burned out halfway through a talk.',
      'She cried during a founder onboarding and didn\'t mute.',
      'She sent a brand moodboard to the wrong thread.',
      'Her aura color was read as "off" by a coach she respects.',
      'She uploaded a voice memo meant to be private.',
      'Her vibe check form auto-closed before saving.',
      'Her Shopify theme reverted to a 2018 version.'
    ]
  },
  {
    id: 'eljas',
    incidents: [
      'His compost bin overflowed mid-Zoom.',
      'He missed a sync because he was testifying at city hall.',
      'His self-built app crashed during a team demo.',
      'He got into a Slack fight about parking equity.',
      'His "burn it down gently" hoodie caused a misunderstanding.',
      'He wrote a long anti-capitalist Slack comment… in the wrong channel.',
      'He planted kale on the roof and got fined by building ops.',
      'His camera glitched mid-rant and froze on a weird face.',
      'His livestream got flagged for "unusual content."',
      'His mic picked up him muttering "this is dumb" during a brainstorm.'
    ]
  }
]; 