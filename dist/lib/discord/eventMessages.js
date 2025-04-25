import { getLocationAndTime } from "./locationTime.js";
export const EVENT_MESSAGES = {
    watercooler: {
        intro: "{arrival}They are gathering by the water cooler.",
        outro: "The coaches have wandered back to their executive suites.",
    },
    newschat: {
        intro: "{arrival}One of them is getting all worked up about a story in tech news.",
        outro: "The coaches have scattered.",
    },
    tmzchat: {
        intro: "{arrival}Coach is bored and is checking out the celebs and entertainment news.",
        outro: "The coaches, begrudgingly, have returned to their desks.",
    },
    pitchchat: {
        intro: "{arrival}A pitch came in and they are gathering in the Board room.",
        outro: "The Board room has emptied out. These folks need to clean up after themselves.",
    },
};
export async function sendEventMessage(channel, eventType, isIntro, gmtHour, gmtMinutes) {
    const message = isIntro
        ? EVENT_MESSAGES[eventType].intro
        : EVENT_MESSAGES[eventType].outro;
    if (isIntro) {
        const { location, formattedTime, ampm, isNewLocation } = getLocationAndTime(gmtHour, gmtMinutes);
        const arrivalText = isNewLocation
            ? `The coaches have just arrived at their ${location}, where it's ${formattedTime}${ampm}. `
            : `The coaches are at their ${location}, where it's ${formattedTime}${ampm}. `;
        const formattedMessage = message.replace("{arrival}", arrivalText);
        await channel.send(formattedMessage);
    }
    else {
        await channel.send(message);
    }
}
