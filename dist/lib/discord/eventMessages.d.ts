import { TextChannel } from 'discord.js';
export declare const EVENT_MESSAGES: {
    readonly watercooler: {
        readonly intro: "{arrival}They are gathering by the water cooler.";
        readonly outro: "The coaches have wandered back to their executive suites.";
    };
    readonly newschat: {
        readonly intro: "{arrival}One of them is getting all worked up about a story in tech news.";
        readonly outro: "The coaches have scattered.";
    };
    readonly tmzchat: {
        readonly intro: "{arrival}Coach is bored and is checking out the celebs and entertainment news.";
        readonly outro: "The coaches, begrudgingly, have returned to their desks.";
    };
    readonly pitchchat: {
        readonly intro: "{arrival}A pitch came in and they are gathering in the Board room.";
        readonly outro: "The Board room has emptied out. These folks need to clean up after themselves.";
    };
};
export declare function sendEventMessage(channel: TextChannel, eventType: keyof typeof EVENT_MESSAGES, isIntro: boolean, gmtHour: number, gmtMinutes: number): Promise<void>;
