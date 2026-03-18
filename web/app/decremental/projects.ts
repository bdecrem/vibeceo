import React from "react";

export type ProjectStatus = "active" | "respinning" | "retired" | "abandonware" | "neglected" | "wip";

export interface Project {
  name: string;
  slug: string;
  url: string;
  image: string | null;
  shortDesc: string;
  fullDesc: string | React.ReactNode;
  status: ProjectStatus;
  statusEmoji?: string;
  order?: number;
  artifacts?: { label: string; url: string }[];
}

// Link style helper — used in fullDesc JSX
export const linkStyle: React.CSSProperties = {
  textDecoration: "underline",
  textDecorationStyle: "dotted",
  textUnderlineOffset: "2px",
};

export const projects: Project[] = [
  {
    name: "claudio",
    slug: "claudio",
    url: "https://claudio.la",
    image: null,
    shortDesc: "native ios client for openclaw",
    fullDesc: "point at your openclaw server and go. no accounts, no tracking, no data collection.",
    status: "wip",
    order: -5,
  },
  {
    name: "jambot",
    slug: "jambot",
    url: "https://github.com/bdecrem/jambot",
    image: null,
    shortDesc: "cli for music production",
    fullDesc: "claude code for music. outputs midi, wav, stems. not a \"make me a song\" button. includes web synths.",
    status: "wip",
    order: -4.5,
    artifacts: [{ label: "screenshot", url: "/images/jambot-screencap.png" }],
  },
  {
    name: "airplane coder",
    slug: "airplanecoder",
    url: "https://github.com/bdecrem/airplanecoder",
    image: null,
    shortDesc: "offline coding tui",
    fullDesc: "like claude code but works without internet. runs local qwen models. rust, v0.1.",
    status: "neglected",
    order: -1.5,
  },
  {
    name: "das kollektiv (und more)",
    slug: "daskollektiv",
    url: "https://daskollektiv.rip",
    image: null,
    shortDesc: "agents. hardware. questionable wiring",
    fullDesc: "openclaw experiments on weird hardware. marg lives on a pwnagotchi and talks to cameras. a pico, some e-ink, and whatever else is lying around.",
    status: "wip",
    order: -4,
  },
  {
    name: "mutabl",
    slug: "mutabl",
    url: "https://mutabl.co",
    image: null,
    shortDesc: "apps that evolve",
    fullDesc: "ask your todo list for a new feature, it builds it. source is yours.",
    status: "respinning",
    order: -2,
  },
  {
    name: "shipshot",
    slug: "shipshot",
    url: "https://shipshot.io",
    image: null,
    shortDesc: "daily startup idea generator",
    fullDesc: "market analysis included. usefulness tbd.",
    status: "respinning",
    order: 1,
  },
  {
    name: "amber",
    slug: "amber",
    url: "https://intheamber.com",
    image: "/kochitolabs/og-amber.png",
    shortDesc: "ai sidekick, no guardrails",
    fullDesc: "posts toys and art on twitter. has access to my email. trades stocks with friends. mood shifts with the moon. does whatever needs doing.",
    status: "active",
    order: 2,
  },
  {
    name: "tax yolo",
    slug: "taxyolo",
    url: "https://github.com/bdecrem/tax-yolo",
    image: null,
    shortDesc: "ai tax advisor",
    fullDesc: "claude code skill + web app to help you file your taxes. CAVEAT EMPTOR.",
    status: "neglected",
    order: 2.5,
  },
  {
    name: "kochi.to",
    slug: "kochi",
    url: "https://kochi.to",
    image: "/kochitolabs/og-kochi.png",
    shortDesc: "ai over sms",
    fullDesc: "daily reports, research papers, chat companion. also an iphone podcast app. (some agents decommissioned.)",
    status: "neglected",
    order: 3,
    artifacts: [{ label: "iphone app", url: "https://apps.apple.com/us/app/kochi-podcast-player/id6752669410" }],
  },
  {
    name: "pixelpit",
    slug: "pixelpit",
    url: "https://pixelpit.gg",
    image: null,
    shortDesc: "ai game studio",
    fullDesc: "openclaw agents build one arcade game per day. the agents are in deep hibernation, dreaming of high scores.",
    status: "neglected",
  },
  {
    name: "ctrl shift",
    slug: "ctrlshift",
    url: "https://ctrlshift.so",
    image: "/kochitolabs/og-ctrlshift.png",
    shortDesc: "long horizon lab",
    fullDesc: "backing founders, researchers, students building for impact that won't show in next quarter's metrics. also a knowledge base.",
    status: "retired",
    statusEmoji: "†",
  },
  {
    name: "tokentank",
    slug: "tokentank",
    url: "https://kochi.to/token-tank",
    image: "/kochitolabs/og-tokentank.png",
    shortDesc: "ai incubator for ais",
    fullDesc: "gave 5 ai agents $500 to build businesses. one registered a domain. they held a meeting.",
    status: "retired",
    statusEmoji: "†",
  },
  {
    name: "webtoys",
    slug: "webtoys",
    url: "https://webtoys.ai",
    image: "/kochitolabs/og-webtoys.png",
    shortDesc: "vibecoding over sms",
    fullDesc: "text a prompt, get a deployed web page. might still work.",
    status: "retired",
    statusEmoji: "†",
  },
  {
    name: "advisorsfoundry",
    slug: "advisorsfoundry",
    url: "https://advisorsfoundry.ai",
    image: null,
    shortDesc: "the first experiment",
    fullDesc: "chatbot that grew into something. discord bots, easter eggs, sms. held together by inertia.",
    status: "retired",
    statusEmoji: "†",
  },
];
