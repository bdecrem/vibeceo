import { TextChannel } from 'discord.js';
import { getLocationAndTime } from './locationTime.js';

type MessagePair = {
  intro: string;
  outro: string;
};

const WATERCOOLER_MESSAGES: MessagePair[] = [
  {
    intro: "They are circling the espresso machine in the break room.",
    outro: "The coaches have returned to their productivity pods."
  },
  {
    intro: "They have gathered on the balcony for some fresh air and bold ideas.",
    outro: "The coaches have retreated indoors to ponder strategy in solitude."
  },
  {
    intro: "They are assembling by the indoor putting green, coffee in hand.",
    outro: "The coaches have drifted back to their standing desks."
  },
  {
    intro: "They are huddled in the innovation lounge, discussing \"the future.\"",
    outro: "The coaches have migrated back to their glass-walled offices."
  },
  {
    intro: "They are swapping stories by the kombucha tap.",
    outro: "The coaches have slipped away to their corner suites."
  },
  {
    intro: "They are comparing vision boards in the mindfulness alcove.",
    outro: "The coaches have melted away to their executive suites."
  },
  {
    intro: "They are lined up at the juice bar, debating the merits of celery.",
    outro: "The coaches have retreated to their ergonomic chairs."
  },
  {
    intro: "They are convening near the ping pong table for some \"dynamic strategy.\"",
    outro: "The coaches have quietly returned to their private call booths."
  },
  {
    intro: "They are sampling tasty bites in the lounge.",
    outro: "The coaches have vanished, presumably to optimize their calendars."
  },
  {
    intro: "They are deep in discussion by the oversized company logo.",
    outro: "The coaches have trickled back to their status-update meetings."
  },
  {
    intro: "They are warming up for the day by the smart whiteboard.",
    outro: "The coaches have faded into the background of the open workspace."
  },
  {
    intro: "They are catching up near the indoor zen fountain.",
    outro: "The coaches have tiptoed back to their task lists."
  },
  {
    intro: "They are camped out at the charging station, devices in hand.",
    outro: "The coaches have strolled back to their soundproof pods."
  },
  {
    intro: "They are plotting by the oversized windows, enjoying the city view.",
    outro: "The coaches have shuffled off to their brainstorming nooks."
  },
  {
    intro: "They are huddled at the snack wall, sharing industry gossip.",
    outro: "The coaches have returned to the land of unread emails."
  },
  {
    intro: "They have gathered by the aquarium, seeking inspiration from the fish.",
    outro: "The coaches have floated back to their idea labs."
  },
  {
    intro: "They are networking near the motivational poster wall.",
    outro: "The coaches have drifted off to their \"deep work\" caves."
  },
  {
    intro: "They are catching up on the latest office memes by the printer.",
    outro: "The coaches have gone back to their innovation cubicles."
  },
  {
    intro: "They are gathering by the watercooler.",
    outro: "The coaches have wandered back to their executive suites."
  },
  {
    intro: "They are gathered in the sunken conversation pit, sipping imported matcha and softly debating the ethics of leadership.",
    outro: "The coaches have dispersed in silence, each vanishing into a different corridor of ambition."
  }
];

export const EVENT_MESSAGES = {
  watercooler: {
    getRandomPair: () => WATERCOOLER_MESSAGES[Math.floor(Math.random() * WATERCOOLER_MESSAGES.length)]
  },
  newschat: {
    intro: "{arrival}One of them is getting all worked up about a story in tech news.",
    outro: "The coaches have scattered."
  },
  tmzchat: {
    intro: "{arrival}Coach is bored and is checking out the celebs and entertainment news.",
    outro: "The coaches, begrudgingly, have returned to their desks."
  },
  pitchchat: {
    intro: "{arrival}A pitch came in and they are gathering in the Board room.",
    outro: "The Board room has emptied out. These folks need to clean up after themselves."
  }
} as const;

export async function sendEventMessage(channel: TextChannel, eventType: keyof typeof EVENT_MESSAGES, isIntro: boolean, gmtHour: number, gmtMinutes: number) {
  let message: string;
  
  if (eventType === 'watercooler') {
    const pair = EVENT_MESSAGES.watercooler.getRandomPair();
    message = isIntro ? pair.intro : pair.outro;
  } else {
    message = isIntro ? EVENT_MESSAGES[eventType].intro : EVENT_MESSAGES[eventType].outro;
  }

  if (isIntro) {
    const { location, formattedTime, ampm, isNewLocation } = getLocationAndTime(gmtHour, gmtMinutes);
    const arrivalText = isNewLocation 
      ? `The coaches have just arrived at their ${location}, where it's ${formattedTime}${ampm}. `
      : `The coaches are at their ${location}, where it's ${formattedTime}${ampm}. `;
    const formattedMessage = message.replace('{arrival}', arrivalText);
    await channel.send(formattedMessage);
  } else {
    await channel.send(message);
  }
} 