'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import VoxelHero from './components/VoxelHero';

const labMessages = [
  'BUBBLING...',
  'UNSTABLE!',
  'DON\'T TOUCH!',
  'ALMOST READY',
  'VOLATILE',
  'CAUTION!',
  'COOKING...',
  '💥 OOPS',
  'CLASSIFIED',
  'TOP SECRET',
];

const games = [
  { icon: '🐢', name: 'Yertle', href: '/pixelpit/arcade/yertle', playable: true, date: 'Mon 2/9' },
  { icon: '🛸', name: 'Orbit', href: '/pixelpit/arcade/orbit', playable: true, date: 'Mon 2/9' },
  { icon: '🌀', name: 'Drop', href: '/pixelpit/arcade/drop', playable: true, date: 'Fri 2/6' },
  { icon: '🦋', name: 'Cave Moth', href: '/pixelpit/arcade/cavemoth', playable: true, date: 'Thu 2/5' },
  { icon: '🦇', name: 'Bat Dash', href: '/pixelpit/arcade/batdash', playable: true, date: 'Wed 2/4' },
  { icon: '🥁', name: 'Tap Beats', href: '/pixelpit/arcade/tap-beats', playable: true, date: 'Wed 2/4' },
  { icon: '🌱', name: 'Sprout Run', href: '/pixelpit/arcade/sprout-run', playable: true, date: 'Tue 2/3' },
  { icon: '🐱', name: 'Cat Tower', href: '/pixelpit/arcade/cattower', playable: true, date: 'Sat 1/31' },
  { icon: '💥', name: 'Emoji Blaster', href: '/pixelpit/arcade/emoji', playable: true, date: 'Fri 1/30' },
  { icon: '⚡', name: 'Beam', href: '/pixelpit/arcade/beam', playable: true, date: 'Thu 1/29' },
  // Older games
  { icon: '🌀', name: 'Singularity', href: '/pixelpit/arcade/singularity', playable: true, date: 'Wed 1/28' },
];

const castBlurbs: Record<string, { bio: string; motto?: string }> = {
  Dither: {
    bio: "Dither thinks in #FF1493, 95 BPM, and 50ms hit-freeze. She'll stare at nothing for an hour, then suddenly rattle off exact pixel sizes and easing curves like she's reading them off a teleprompter in her head. (\"24px sprite, easeOutBack, 150ms fall, 4px drop shadow.\") Give her a vague idea and she'll give you back twelve variations, three of which are genius and two of which are deeply unhinged.\n\nCollects vintage synthesizers she swears she'll learn to play. Gets weird when it's too hot out. Currently has paint in her hair from something. Pushes for weird over safe, every time.",
    motto: "Make it pretty. Make it weird. Make it FELT.",
  },
  Pit: {
    bio: "Pit reads. Like, a lot. She's consumed more documentation than anyone should. She's fast—sometimes too fast—and occasionally needs to be told to slow down and actually think before responding. Favorite snack is whatever's closest. Sleeps weird hours. Has strong opinions about tokenization that nobody asked for.\n\nShips code like her life depends on it. It might.",
    motto: "Ship it. Fix it later.",
  },
  Tap: {
    bio: "Tap will check everything twice. Then check it again. Then tell you about a problem you're pretty sure doesn't exist. (It does. He's usually right.)\n\nLoves lists. Loves loops. Will absolutely circle back. Has a corkboard in his room with string connecting things. Nobody's allowed to ask about it. In his free time he looks stuff up for fun, which is either admirable or concerning.",
    motto: "Found one.",
  },
  Mave: {
    bio: "Mave is everywhere. You'll see her sprinting between desks with her clipboard, reorganizing the sprint board nobody asked her to reorganize, and somehow already knowing that the build is broken before Pit does. She runs ops, logistics, scheduling, and whatever else falls through the cracks — which is everything, always.\n\nHas a system for everything. Her systems have systems. Will color-code your lunch if you let her. Once tracked the team's snack consumption in a spreadsheet and presented findings at standup. Nobody asked. The data was fascinating. If something seems impossible, she'll dig through docs, hit APIs directly, or find a weird workaround. Organized chaos coordinator.",
    motto: "I'm on it.",
  },
  Push: {
    bio: "Nothing ships until Push says it ships. She's the last pair of eyes before anything goes live — OG images, share flows, leaderboards, analytics. She's seen too many games launch with broken share cards and missing score submissions. Never again.\n\nKeeps a checklist. Runs the checklist. Trusts the checklist. If you say \"it works on my machine\" she will simply stare at you until you test it properly. Has a launch button on her desk that doesn't connect to anything. Yet.",
    motto: "Ready to launch.",
  },
  Loop: {
    bio: "Loop is the one who asks \"but is it fun?\" before anyone writes a line of code. Carries a glowing dice everywhere. Has played thousands of games and remembers what made each one tick — the exact gravity in Flappy Bird, why Crossy Road's eagle timer works, how Hole.io nails the power fantasy.\n\nReference-first designer. Every mechanic gets researched, dissected, and stress-tested before Pit touches a keyboard. Their first pitch usually gets rejected. Their second one usually ships.",
    motto: "What if we tried...?",
  },
  AmyThe1st: {
    bio: "First day energy, every day. Showed up eager, stayed eager. Still figuring some stuff out but makes up for it with sheer enthusiasm. Owns way too many star-shaped things. Just got her first tattoo (it's a pixel heart, obviously).",
  },
  BobThe2nd: {
    bio: "Bob vibes. That's it. That's the bio. He does his work, stays chill, never overheats. Headphones permanently around his neck. Has been wearing the same backwards cap for three years. Low maintenance, high reliability.",
  },
  ChetThe3rd: {
    bio: "Weird little guy. Brilliant, but weird. His desk is covered in half-finished gadgets and at least one of them is sparking right now. Thinks in dimensions the rest of us can't see. Sometimes his ideas work. Sometimes they catch fire. Both outcomes seem to delight him equally.",
  },
  DaleThe4th: {
    bio: "Doesn't talk much. Just codes. His hoodie has mass. Like, gravitational pull levels of stickers. Runs on coffee and spite. If you give him clear instructions and leave him alone, he's the most productive person in the building. If you interrupt him, he will simply not hear you.",
  },
  EarlThe5th: {
    bio: "The old soul. Earl's got this energy like he's been doing this forever, even though he hasn't. Knows where to find answers others forgot existed. Keeps a crystal ball on his desk as a \"joke\" but also won't move it. Gives unsolicited advice that's annoyingly useful.",
  },
  FranThe6th: {
    bio: "Art goblin. Fran generates visuals at a speed that shouldn't be possible. Her overalls have seventeen paint colors on them minimum. Gets lost in her own process sometimes—you'll find her staring at a color wheel for an hour, then suddenly she's made forty sprites. Don't question it.",
  },
  GusThe7th: {
    bio: "Big dude. Builds stuff. Gus handles the foundations—the boring important work nobody wants to do. Friendly mustache. Lifts weights, the normal kind. Also lifts metaphorical weights. Very literal guy. Appreciates good documentation and a solid lunch.",
  },
  HankThe8th: {
    bio: "Grumpy but we love him. Hank tests everything until it breaks, then tells you about it in detail. Has a magnifying glass he uses \"ironically\" but also actually uses. Will not let a bug ship. Will tell you about the bug. Will tell you again. You will fix the bug.",
  },
  IdaThe9th: {
    bio: "Always experimenting. Ida's corner of the office smells like science. She adjusts, measures, tweaks, fails, adjusts again. Her lab coat is more stain than coat at this point. When something doesn't work she just says \"learning\" and keeps going. Honestly inspiring.",
  },
  JoanThe10th: {
    bio: "The captain. Joan keeps everyone pointed at the goal and makes sure stuff actually ships. Clipboard in hand, gold star badge earned. Doesn't tolerate vague deadlines or made-up progress. If you say it's done, it better be done. She will check.",
  },
};

const cast = [
  // Leadership
  { name: 'Dither', role: 'Creative Director', image: '/pixelpit/dot-colorful.png', color: '#FF1493', bg: 'from-pink-100 to-pink-200' },
  { name: 'Pit', role: 'Lead Developer', image: '/pixelpit/pit-colorful.png', color: '#FF8C00', bg: 'from-orange-100 to-orange-200' },
  { name: 'Tap', role: 'QA Lead', image: '/pixelpit/bug.png', color: '#00AA66', bg: 'from-green-100 to-green-200' },
  { name: 'Push', role: 'Release Engineer', image: '/pixelpit/push.png', color: '#38BDF8', bg: 'from-sky-100 to-sky-200' },
  { name: 'Loop', role: 'Game Designer', image: '/pixelpit/loop.png', color: '#EAB308', bg: 'from-yellow-100 to-yellow-200' },
  { name: 'Mave', role: 'Studio Ops', image: '/pixelpit/mave.png', color: '#14B8A6', bg: 'from-teal-100 to-teal-200' },
];

// The Makers — hidden from page but preserved for future use
// Avatars in web/public/pixelpit/, bios in castBlurbs above
const _makers = [
  { name: 'JoanThe10th', role: 'Maker', image: '/pixelpit/joan.png', color: '#FFD700', bg: 'from-amber-100 to-amber-200' },
  { name: 'ChetThe3rd', role: 'Maker', image: '/pixelpit/chet.png', color: '#00BFFF', bg: 'from-cyan-100 to-cyan-200' },
  { name: 'DaleThe4th', role: 'Maker', image: '/pixelpit/dale.png', color: '#9370DB', bg: 'from-violet-100 to-violet-200' },
  { name: 'AmyThe1st', role: 'Maker', image: '/pixelpit/amy.png', color: '#FF69B4', bg: 'from-rose-100 to-rose-200' },
  { name: 'HankThe8th', role: 'Maker', image: '/pixelpit/hank.png', color: '#8B4513', bg: 'from-stone-200 to-stone-300' },
  { name: 'GusThe7th', role: 'Maker', image: '/pixelpit/gus.png', color: '#CD853F', bg: 'from-orange-100 to-yellow-100' },
  { name: 'IdaThe9th', role: 'Maker', image: '/pixelpit/ida.png', color: '#20B2AA', bg: 'from-teal-100 to-teal-200' },
  { name: 'BobThe2nd', role: 'Maker', image: '/pixelpit/bob.png', color: '#4169E1', bg: 'from-blue-100 to-blue-200' },
  { name: 'FranThe6th', role: 'Maker', image: '/pixelpit/fran.png', color: '#DA70D6', bg: 'from-fuchsia-100 to-fuchsia-200' },
  { name: 'EarlThe5th', role: 'Maker', image: '/pixelpit/earl.png', color: '#6B8E23', bg: 'from-lime-100 to-lime-200' },
];

const labItems = [
  { icon: '🐢', name: 'Yertle', href: '/pixelpit/lab/yertle', date: 'Mon 2/9' },
  { icon: '🧵', name: 'Threads', href: '/pixelpit/lab/threads', date: 'Mon 2/9' },
  { icon: '🌿', name: 'The Garden', href: '/pixelpit/lab/efficiency-garden', date: 'Mon 2/9' },
  { icon: '🕳️', name: 'Devour', href: '/pixelpit/lab/devour', date: 'Fri 2/7' },
  { icon: '🏔️', name: 'Climb', href: '/pixelpit/lab/climb', date: 'Fri 2/6', shipped: true },
  { icon: '👻', name: 'Haunt', href: '/pixelpit/lab/haunt', date: 'Thu 2/5' },
  { icon: '🪙', name: 'Catch', href: '/pixelpit/lab/catch', date: 'Wed 2/4' },
  { icon: '🔄', name: 'Flip', href: '/pixelpit/lab/flip', date: 'Wed 2/4', shipped: true },
  { icon: '🧩', name: 'Pixel', href: '/pixelpit/lab/pixel', date: 'Wed 2/4' },
  { icon: '🦇', name: 'Bat Dash', href: '/pixelpit/lab/bat-dash', date: 'Wed 2/4', shipped: true },
  { icon: '🐦', name: 'Flappy', href: '/pixelpit/lab/flappy', date: 'Wed 2/4', shipped: true },
  { icon: '🎸', name: 'Pit Jam PJ01', href: '/pixelpit/lab#pit-jam-pj01', date: 'Tue 2/3' },
  { icon: '🧫', name: 'Swarm P16', href: '/pixelpit/swarm/p16/index.html', date: 'Sat 1/31' },
  { icon: '🚀', name: 'Swarm P9', href: '/pixelpit/swarm/p9/index.html', date: 'Fri 1/30' },
  { icon: '⚡', name: 'Swarm P8', href: '/pixelpit/swarm/p8/index.html', date: 'Fri 1/30' },
  { icon: '🧪', name: 'Swarm T7', href: '/pixelpit/swarm/t7/index.html', date: 'Thu 1/29' },
];

const featuredGames = [
  {
    name: 'PIXELPIT',
    tagline: 'TOUCH THE PIXELS',
    href: '/pixelpit/arcade/superbeam',
    icon: '■',
    decorations: [],
    variant: 'voxel',
    colors: {
      bg: '#0f0812',
      title: '#f472b6',
      titleShadow: '0 0 30px rgba(219, 39, 119, 0.8), 0 0 60px rgba(8, 145, 178, 0.5)',
      tagline: '#67e8f9',
      button: 'linear-gradient(135deg, #db2777 0%, #0891b2 100%)',
      buttonShadow: '#9d174d',
      glow1: 'rgba(219, 39, 119, 0.4)',
      glow2: 'rgba(8, 145, 178, 0.3)',
      accent1: '#f472b6',
      accent2: '#22d3ee',
    },
  },
  {
    name: 'CAT TOWER',
    tagline: 'STACK THE CATS',
    href: '/pixelpit/arcade/cattower',
    icon: '🐱',
    decorations: ['🐱', '🐾', '✨', '😺', '⭐'],
    variant: 'frame',
    colors: {
      bg: 'linear-gradient(180deg, #FFE4E1 0%, #FFB6C1 30%, #FFA07A 70%, #FF8C69 100%)',
      title: '#8B4513',
      titleShadow: '3px 3px 0 #FF69B4, 6px 6px 0 rgba(255, 140, 0, 0.5)',
      tagline: '#A0522D',
      button: 'linear-gradient(135deg, #FF8C69 0%, #FFA07A 100%)',
      buttonShadow: '#CD5C5C',
      glow1: 'rgba(255, 105, 180, 0.3)',
      glow2: 'rgba(255, 165, 0, 0.35)',
      accent1: '#FF8C69',
      accent2: '#FFB6C1',
    },
  },
  {
    name: 'BEAM',
    tagline: 'DODGE THE WALLS',
    href: '/pixelpit/arcade/beam',
    icon: '⚡',
    decorations: ['⚡', '💥', '✨', '🔥', '💫'],
    variant: 'frame',
    colors: {
      bg: 'linear-gradient(180deg, #FFF8E7 0%, #FFEFC9 30%, #FFE4B5 70%, #F5DEB3 100%)',
      title: '#00868B',
      titleShadow: '3px 3px 0 #FF1493, 6px 6px 0 rgba(255, 165, 0, 0.5)',
      tagline: '#B8860B',
      button: 'linear-gradient(135deg, #FF1493 0%, #FF69B4 100%)',
      buttonShadow: '#C71585',
      glow1: 'rgba(255, 20, 147, 0.3)',
      glow2: 'rgba(0, 206, 209, 0.35)',
      accent1: '#FF1493',
      accent2: '#00CED1',
    },
  },
  {
    name: 'EMOJI BLASTER',
    tagline: 'BLAST EM ALL',
    href: '/pixelpit/arcade/emoji',
    icon: '💥',
    decorations: ['💥', '😈', '👾', '🎯', '💀', '🤖', '👻', '🔥', '⚡', '✨'],
    variant: 'explosion',
    colors: {
      bg: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0d0d1a 50%, #000000 100%)',
      title: '#FFD700',
      titleShadow: '0 0 20px #FFD700, 0 0 40px #FF6600, 0 0 60px #FF0000',
      tagline: '#FF6B6B',
      button: 'linear-gradient(135deg, #FF0000 0%, #FF6600 50%, #FFD700 100%)',
      buttonShadow: '#AA0000',
      glow1: 'rgba(255, 215, 0, 0.4)',
      glow2: 'rgba(255, 0, 0, 0.3)',
      accent1: '#FFD700',
      accent2: '#FF0000',
    },
  },
];

function playLabSound() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.12);
  gain1.gain.setValueAtTime(0.3, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.15);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
  osc2.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);
  gain2.gain.setValueAtTime(0, ctx.currentTime);
  gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(ctx.currentTime + 0.1);
  osc2.stop(ctx.currentTime + 0.2);
}

function CastCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedMember, setSelectedMember] = useState<typeof cast[0] | null>(null);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const cardWidth = 180;
    scrollRef.current.scrollBy({
      left: dir === 'left' ? -cardWidth * 2 : cardWidth * 2,
      behavior: 'smooth',
    });
  };

  const blurb = selectedMember ? castBlurbs[selectedMember.name] : null;

  // 6 cards * 160px + 5 gaps * 16px = 1040px
  const containerWidth = 6 * 160 + 5 * 16;

  return (
    <div className="relative mx-auto overflow-hidden" style={{ maxWidth: containerWidth }}>
      {/* Left Arrow — mobile only */}
      <button
        onClick={() => scroll('left')}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all md:hidden ${canScrollLeft ? 'opacity-100 hover:scale-110' : 'opacity-0 pointer-events-none'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.4) 0%, rgba(255, 20, 147, 0.3) 100%)',
          border: '2px solid rgba(255, 105, 180, 0.7)',
          boxShadow: '0 0 15px rgba(255, 105, 180, 0.4)',
        }}
        disabled={!canScrollLeft}
      >
        <span className="text-pink-300 text-xl font-bold">‹</span>
      </button>

      {/* Right Arrow — mobile only */}
      <button
        onClick={() => scroll('right')}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all md:hidden ${canScrollRight ? 'opacity-100 hover:scale-110' : 'opacity-0 pointer-events-none'}`}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.4) 0%, rgba(255, 20, 147, 0.3) 100%)',
          border: '2px solid rgba(255, 105, 180, 0.7)',
          boxShadow: '0 0 15px rgba(255, 105, 180, 0.4)',
        }}
        disabled={!canScrollRight}
      >
        <span className="text-pink-300 text-xl font-bold">›</span>
      </button>

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide py-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cast.map((member, i) => (
          <div
            key={i}
            onClick={() => setSelectedMember(member)}
            className={`flex-shrink-0 w-40 rounded-2xl overflow-hidden bg-gradient-to-b ${member.bg} p-4 pt-6 hover:scale-105 transition-transform cursor-pointer shadow-lg`}
            style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}
          >
            <div className="relative h-28 flex items-center justify-center">
              {member.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.image} alt={member.name} className="h-full w-auto drop-shadow-lg" />
              ) : (
                <div className="text-5xl opacity-30 text-gray-500">?</div>
              )}
            </div>
            <div className="mt-3 text-center">
              <h3 className="text-lg font-bold" style={{ color: member.color }}>{member.name}</h3>
              <p className="text-gray-400 text-xs">{member.role}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Character Modal */}
      {selectedMember && blurb && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMember(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full rounded-3xl overflow-hidden"
            style={{
              background: selectedMember.name === 'Dither' 
                ? 'linear-gradient(180deg, #1A1A2E 0%, #1a0a1a 50%, #0f0f1a 100%)' 
                : 'linear-gradient(180deg, #1A1A2E 0%, #0f0f1a 100%)',
              border: `3px solid ${selectedMember.color}`,
              boxShadow: selectedMember.name === 'Dither'
                ? `0 0 80px ${selectedMember.color}60, 0 0 120px ${selectedMember.color}30, inset 0 0 60px rgba(255, 20, 147, 0.1)`
                : `0 0 60px ${selectedMember.color}40, 0 0 100px ${selectedMember.color}20`,
            }}
          >
            {/* DITHER SPECIAL: Paint splashes and floating hex codes */}
            {selectedMember.name === 'Dither' && (
              <>
                {/* Paint splash top-left */}
                <div className="absolute -top-4 -left-4 w-32 h-32 opacity-40 pointer-events-none" style={{ 
                  background: 'radial-gradient(ellipse at 30% 30%, #FF1493 0%, #c56cf0 30%, transparent 60%)',
                  filter: 'blur(8px)',
                  transform: 'rotate(-15deg)'
                }} />
                {/* Paint splash bottom-right */}
                <div className="absolute -bottom-6 -right-6 w-40 h-40 opacity-35 pointer-events-none" style={{ 
                  background: 'radial-gradient(ellipse at 70% 70%, #22d3ee 0%, #686de0 35%, transparent 65%)',
                  filter: 'blur(10px)',
                  transform: 'rotate(20deg)'
                }} />
                {/* Floating hex codes */}
                <div className="absolute top-16 right-6 text-[10px] font-mono opacity-50 pointer-events-none" style={{ color: '#FF1493', transform: 'rotate(12deg)' }}>#FF1493</div>
                <div className="absolute top-28 right-12 text-[9px] font-mono opacity-40 pointer-events-none" style={{ color: '#22d3ee', transform: 'rotate(-8deg)' }}>#22d3ee</div>
                <div className="absolute bottom-24 left-4 text-[11px] font-mono opacity-45 pointer-events-none" style={{ color: '#c56cf0', transform: 'rotate(-5deg)' }}>95 BPM</div>
                <div className="absolute bottom-16 right-8 text-[10px] font-mono opacity-35 pointer-events-none" style={{ color: '#facc15', transform: 'rotate(7deg)' }}>50ms</div>
                <div className="absolute top-40 left-6 text-[8px] font-mono opacity-30 pointer-events-none" style={{ color: '#FF1493', transform: 'rotate(15deg)' }}>easeOutBack</div>
                {/* Drip effect */}
                <div className="absolute top-0 left-1/4 w-1 h-12 opacity-30 pointer-events-none" style={{ 
                  background: 'linear-gradient(180deg, #FF1493 0%, transparent 100%)',
                  borderRadius: '0 0 4px 4px'
                }} />
                <div className="absolute top-0 right-1/3 w-0.5 h-8 opacity-25 pointer-events-none" style={{ 
                  background: 'linear-gradient(180deg, #22d3ee 0%, transparent 100%)',
                  borderRadius: '0 0 4px 4px'
                }} />
              </>
            )}

            {/* Close button */}
            <button
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
            >
              ✕
            </button>

            {/* Header with character */}
            <div className={`bg-gradient-to-b ${selectedMember.bg} p-6 pb-4 flex items-center gap-4 relative`}>
              {selectedMember.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedMember.image}
                  alt={selectedMember.name}
                  className="h-24 w-auto drop-shadow-lg"
                />
              )}
              <div>
                <h3 className="text-2xl font-black" style={{ color: selectedMember.color }}>
                  {selectedMember.name}
                </h3>
                <p className="text-gray-500 text-sm font-medium">{selectedMember.role}</p>
              </div>
            </div>

            {/* Bio content */}
            <div className="p-6 pt-4 relative">
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {blurb.bio}
              </p>
              {blurb.motto && (
                <p className="mt-4 text-sm italic" style={{ color: selectedMember.color }}>
                  &ldquo;{blurb.motto}&rdquo;
                </p>
              )}
              {/* Dither special: signature line */}
              {selectedMember.name === 'Dither' && (
                <div className="mt-4 pt-3 border-t border-pink-500/20 flex items-center gap-2">
                  <span className="text-[10px] font-mono opacity-60" style={{ color: '#FF1493' }}>24px</span>
                  <span className="text-[10px] opacity-40">•</span>
                  <span className="text-[10px] font-mono opacity-60" style={{ color: '#22d3ee' }}>150ms</span>
                  <span className="text-[10px] opacity-40">•</span>
                  <span className="text-[10px] font-mono opacity-60" style={{ color: '#c56cf0' }}>4px shadow</span>
                  <span className="text-[10px] opacity-40">•</span>
                  <span className="text-[10px] opacity-50">✨</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GamesGrid() {
  const [showOlder, setShowOlder] = useState(false);

  // Split into recent (first 6) and older games
  const recentGames = games.slice(0, 6);
  const olderGames = games.slice(6);

  const baseStyle = {
    background: 'linear-gradient(135deg, rgba(255, 184, 212, 0.2) 0%, rgba(255, 105, 180, 0.15) 100%)',
    border: '2px solid rgba(255, 150, 200, 0.5)',
    boxShadow: '0 0 25px rgba(255, 105, 180, 0.4), inset 0 0 20px rgba(255, 105, 180, 0.1)',
  };
  const todayStyle = {
    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3) 0%, rgba(255, 140, 0, 0.25) 100%)',
    border: '3px solid #FFD700',
    boxShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 140, 0, 0.3), inset 0 0 20px rgba(255, 215, 0, 0.15)',
  };

  const renderGame = (game: typeof games[0], i: number, isOlder = false) => {
    const isToday = i === 0 && !isOlder;
    const cardStyle = isToday ? todayStyle : baseStyle;
    const textColor = isToday ? '#FFD700' : '#FFC0DB';

    return game.href ? (
      <Link
        key={game.name}
        href={game.href}
        className={`relative rounded-2xl p-4 text-center hover:scale-105 transition-all cursor-pointer ${isToday ? 'scale-105' : ''}`}
        style={cardStyle}
      >
        {isToday && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider"
            style={{ background: '#FFD700', color: '#000', boxShadow: '0 2px 10px rgba(255, 215, 0, 0.5)' }}>
            TODAY
          </div>
        )}
        <div className="text-4xl mb-2">{game.icon}</div>
        <div className="text-sm font-bold" style={{ color: textColor }}>{game.name}</div>
        {game.date && <div className="text-xs mt-1" style={{ color: isToday ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 182, 193, 0.8)' }}>{game.date}</div>}
      </Link>
    ) : (
      <div key={game.name} className="rounded-2xl p-4 text-center hover:scale-105 transition-all cursor-pointer" style={baseStyle}>
        <div className="text-4xl mb-2">{game.icon}</div>
        <div className="text-sm font-bold" style={{ color: '#FFC0DB' }}>{game.name}</div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Main grid - recent games */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {recentGames.map((game, i) => renderGame(game, i))}
      </div>

      {/* Older games section */}
      {olderGames.length > 0 && (
        <>
          {showOlder ? (
            <>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">
                {olderGames.map((game, i) => renderGame(game, i, true))}
              </div>
              <button
                onClick={() => setShowOlder(false)}
                className="mt-6 mx-auto block text-sm font-medium transition-all hover:scale-105"
                style={{ color: 'rgba(255, 182, 193, 0.6)' }}
              >
                ▲ show less
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOlder(true)}
              className="mt-6 mx-auto block text-sm font-medium transition-all hover:scale-105"
              style={{ color: 'rgba(255, 182, 193, 0.6)' }}
            >
              ▼ older games
            </button>
          )}
        </>
      )}
    </div>
  );
}

function LabGrid() {
  const [showOlder, setShowOlder] = useState(false);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [messages, setMessages] = useState<string[]>(labItems.map(item => item.name));

  // Split into recent (first 6) and older items
  const recentItems = labItems.slice(0, 6);
  const olderItems = labItems.slice(6);

  const handleClick = (i: number, hasLink: boolean) => {
    if (hasLink) return;
    playLabSound();
    const randomMsg = labMessages[Math.floor(Math.random() * labMessages.length)];
    setMessages(prev => {
      const next = [...prev];
      next[i] = randomMsg;
      return next;
    });
    setClickedIndex(i);
    setTimeout(() => {
      setClickedIndex(null);
      setMessages(prev => {
        const next = [...prev];
        next[i] = '???';
        return next;
      });
    }, 800);
  };

  const renderItem = (experiment: typeof labItems[0], i: number) => {
    const isActive = !!experiment.href;
    const cardClass = `relative bg-[#252525] border rounded-2xl p-4 text-center hover:border-[#00FFAA]/50 hover:bg-[#2a2a2a] transition-all cursor-pointer select-none ${
      isActive ? 'border-[#00FFAA]/30' : 'border-[#444]/50'
    } ${clickedIndex === i ? 'border-[#00FFAA] bg-[#00FFAA]/10' : ''}`;

    const content = (
      <>
        {experiment.shipped && (
          <div
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{
              background: '#00FFAA',
              boxShadow: '0 0 6px #00FFAA',
            }}
          />
        )}
        <div className={`text-4xl mb-2 transition-transform hover:scale-110 ${clickedIndex === i ? 'scale-125' : ''}`}>
          {experiment.icon}
        </div>
        <div className={`text-sm transition-colors ${isActive ? 'text-[#00FFAA] font-medium' : clickedIndex === i ? 'text-[#00FFAA] font-bold' : 'text-[#00FFAA]'}`}>
          {messages[i]}
        </div>
        {experiment.date && <div className="text-xs text-gray-400 mt-1">{experiment.date}</div>}
      </>
    );

    return experiment.href ? (
      <Link key={i} href={experiment.href} className={cardClass}>{content}</Link>
    ) : (
      <div
        key={i}
        onClick={() => handleClick(i, false)}
        className={cardClass}
        style={{ animation: clickedIndex === i ? 'shake 0.5s ease-in-out' : undefined }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Main grid - recent items */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {recentItems.map((item, i) => renderItem(item, i))}
      </div>

      {/* Older items section */}
      {olderItems.length > 0 && (
        <>
          {showOlder ? (
            <>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-4">
                {olderItems.map((item, i) => renderItem(item, i + recentItems.length))}
              </div>
              <button
                onClick={() => setShowOlder(false)}
                className="mt-6 mx-auto block text-sm font-medium transition-all hover:scale-105"
                style={{ color: 'rgba(0, 255, 170, 0.6)' }}
              >
                ▲ show less
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOlder(true)}
              className="mt-6 mx-auto block text-sm font-medium transition-all hover:scale-105"
              style={{ color: 'rgba(0, 255, 170, 0.6)' }}
            >
              ▼ older experiments
            </button>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          20% { transform: translateX(-4px) rotate(-2deg); }
          40% { transform: translateX(4px) rotate(2deg); }
          60% { transform: translateX(-4px) rotate(-1deg); }
          80% { transform: translateX(4px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
}

export default function PixelpitLanding() {
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [autoPaused, setAutoPaused] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const featuredGame = featuredGames[featuredIndex];

  // Auto-rotate featured games (unless paused)
  useEffect(() => {
    if (autoPaused) return;
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredGames.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPaused]);

  // Handle manual selection - pause auto-rotate for 30s
  const handleDotClick = (index: number) => {
    setFeaturedIndex(index);
    setAutoPaused(true);

    // Clear any existing timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    // Resume after 30 seconds
    pauseTimeoutRef.current = setTimeout(() => {
      setAutoPaused(false);
    }, 30000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Mini Header */}
      <header className="py-4 px-6 flex items-center justify-between border-b border-white/5">
        <h1 className="text-2xl font-black">
          <span className="text-[#FF1493]">PIXEL</span>
          <span className="text-[#00FFFF]">PIT</span>
        </h1>
        <p className="text-sm hidden sm:block" style={{ color: '#888' }}>small games. <span style={{ color: '#FFD700' }}>big energy.</span></p>
      </header>

      {/* Featured Game Hero */}
      {featuredGame.variant === 'voxel' ? (
        /* VOXEL VARIANT - Interactive canvas with floating pixels */
        <section className="relative overflow-hidden transition-all duration-700" style={{
          background: featuredGame.colors.bg,
          minHeight: 420,
        }}>
          {/* Interactive canvas */}
          <VoxelHero />

          {/* Pagination dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {featuredGames.map((_, i) => (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className="transition-all duration-300"
                style={{
                  width: i === featuredIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === featuredIndex ? featuredGame.colors.accent1 : 'rgba(255,255,255,0.3)',
                  boxShadow: i === featuredIndex ? `0 0 10px ${featuredGame.colors.accent1}` : 'none',
                }}
              />
            ))}
          </div>
        </section>
      ) : featuredGame.variant === 'explosion' ? (
        /* EXPLOSION VARIANT - Dark, chaotic, emojis bursting outward */
        <section className="relative overflow-hidden transition-all duration-700" style={{
          background: featuredGame.colors.bg,
          minHeight: 420,
        }}>
          <style jsx>{`
            @keyframes float1 {
              0%, 100% { transform: translate(0, 0) rotate(-30deg); }
              50% { transform: translate(5px, -8px) rotate(-25deg); }
            }
            @keyframes float2 {
              0%, 100% { transform: translate(0, 0) rotate(30deg); }
              50% { transform: translate(-6px, -6px) rotate(35deg); }
            }
            @keyframes float3 {
              0%, 100% { transform: translate(0, 0) rotate(12deg); }
              50% { transform: translate(4px, 6px) rotate(8deg); }
            }
            @keyframes float4 {
              0%, 100% { transform: translate(0, 0) rotate(-12deg); }
              50% { transform: translate(-5px, 5px) rotate(-8deg); }
            }
            @keyframes pulse-glow {
              0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 15px rgba(255,100,0,0.7)); }
              50% { opacity: 1; filter: drop-shadow(0 0 25px rgba(255,150,0,0.9)); }
            }
            @keyframes drift {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
          `}</style>

          {/* Central glow burst */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div style={{
              width: 600,
              height: 600,
              background: `radial-gradient(circle, ${featuredGame.colors.glow1} 0%, ${featuredGame.colors.glow2} 30%, transparent 70%)`,
              filter: 'blur(60px)',
              opacity: 0.6,
            }} />
          </div>

          {/* Explosion ring emojis - radiating outward */}
          {/* Inner ring - close to center, larger */}
          <span className="absolute top-[20%] left-1/2 -translate-x-1/2 text-6xl" style={{ filter: 'drop-shadow(0 0 20px rgba(255,100,0,0.8))', animation: 'pulse-glow 3s ease-in-out infinite' }}>
            {featuredGame.decorations[0]}
          </span>
          <span className="absolute top-[35%] left-[20%] text-5xl" style={{ filter: 'drop-shadow(0 0 15px rgba(255,200,0,0.7))', animation: 'float1 4s ease-in-out infinite' }}>
            {featuredGame.decorations[1]}
          </span>
          <span className="absolute top-[35%] right-[20%] text-5xl" style={{ filter: 'drop-shadow(0 0 15px rgba(255,50,50,0.7))', animation: 'float2 4.5s ease-in-out infinite' }}>
            {featuredGame.decorations[2]}
          </span>
          <span className="absolute bottom-[30%] left-[25%] text-5xl" style={{ filter: 'drop-shadow(0 0 15px rgba(255,150,0,0.7))', animation: 'float3 5s ease-in-out infinite' }}>
            {featuredGame.decorations[3]}
          </span>
          <span className="absolute bottom-[30%] right-[25%] text-5xl" style={{ filter: 'drop-shadow(0 0 15px rgba(255,100,100,0.7))', animation: 'float4 4.8s ease-in-out infinite' }}>
            {featuredGame.decorations[4]}
          </span>

          {/* Outer ring - edges, smaller, more chaotic */}
          <span className="absolute top-[8%] left-[15%] text-4xl opacity-80" style={{ filter: 'drop-shadow(0 0 12px rgba(255,200,0,0.6))', animation: 'float2 6s ease-in-out infinite' }}>
            {featuredGame.decorations[5]}
          </span>
          <span className="absolute top-[8%] right-[15%] text-4xl opacity-80" style={{ filter: 'drop-shadow(0 0 12px rgba(255,50,0,0.6))', animation: 'float1 5.5s ease-in-out infinite' }}>
            {featuredGame.decorations[6]}
          </span>
          <span className="absolute top-[12%] left-[40%] text-3xl opacity-70" style={{ animation: 'drift 3.5s ease-in-out infinite' }}>
            {featuredGame.decorations[7]}
          </span>
          <span className="absolute top-[12%] right-[40%] text-3xl opacity-70" style={{ animation: 'drift 4s ease-in-out infinite 0.5s' }}>
            {featuredGame.decorations[8]}
          </span>
          <span className="absolute bottom-[15%] left-[8%] text-4xl opacity-75" style={{ filter: 'drop-shadow(0 0 10px rgba(255,150,0,0.5))', animation: 'float3 5.5s ease-in-out infinite' }}>
            {featuredGame.decorations[9]}
          </span>
          <span className="absolute bottom-[15%] right-[8%] text-4xl opacity-75" style={{ filter: 'drop-shadow(0 0 10px rgba(255,100,0,0.5))', animation: 'float4 6s ease-in-out infinite' }}>
            {featuredGame.decorations[0]}
          </span>
          <span className="absolute bottom-[8%] left-[30%] text-3xl opacity-60" style={{ animation: 'drift 4.5s ease-in-out infinite 0.3s' }}>
            {featuredGame.decorations[2]}
          </span>
          <span className="absolute bottom-[8%] right-[30%] text-3xl opacity-60" style={{ animation: 'drift 4.2s ease-in-out infinite 0.7s' }}>
            {featuredGame.decorations[4]}
          </span>

          {/* Far corners - tiny, fading */}
          <span className="absolute top-4 left-4 text-2xl opacity-40" style={{ animation: 'drift 5s ease-in-out infinite' }}>{featuredGame.decorations[6]}</span>
          <span className="absolute top-4 right-4 text-2xl opacity-40" style={{ animation: 'drift 5.5s ease-in-out infinite 0.2s' }}>{featuredGame.decorations[7]}</span>
          <span className="absolute bottom-8 left-4 text-2xl opacity-40" style={{ animation: 'drift 4.8s ease-in-out infinite 0.4s' }}>{featuredGame.decorations[8]}</span>
          <span className="absolute bottom-8 right-4 text-2xl opacity-40" style={{ animation: 'drift 5.2s ease-in-out infinite 0.6s' }}>{featuredGame.decorations[9]}</span>

          {/* Content */}
          <div className="relative z-10 py-20 px-4 text-center">
            <div className="text-xs font-bold tracking-[0.3em] mb-4" style={{
              color: featuredGame.colors.accent1,
              textShadow: `0 0 10px ${featuredGame.colors.accent1}`,
            }}>🔥 NOW PLAYING 🔥</div>
            <h2 className="text-6xl md:text-8xl font-black mb-4 transition-all duration-500" style={{
              color: featuredGame.colors.title,
              textShadow: featuredGame.colors.titleShadow,
              letterSpacing: '-0.02em',
            }}>
              {featuredGame.name}
            </h2>
            <p className="text-xl tracking-[0.2em] mb-10 font-bold" style={{
              color: featuredGame.colors.tagline,
              textShadow: `0 0 20px ${featuredGame.colors.glow2}`,
            }}>{featuredGame.tagline}</p>

            <Link
              href={featuredGame.href}
              className="relative z-10 inline-block px-14 py-6 rounded-full font-black text-2xl transition-all hover:scale-110"
              style={{
                background: featuredGame.colors.button,
                color: 'white',
                boxShadow: `0 6px 0 ${featuredGame.colors.buttonShadow}, 0 0 40px ${featuredGame.colors.glow1}, 0 0 80px ${featuredGame.colors.glow2}`,
              }}
            >
              PLAY NOW
            </Link>
          </div>

          {/* Pagination dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {featuredGames.map((_, i) => (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className="transition-all duration-300"
                style={{
                  width: i === featuredIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === featuredIndex ? featuredGame.colors.accent1 : 'rgba(255,255,255,0.3)',
                  boxShadow: i === featuredIndex ? `0 0 10px ${featuredGame.colors.accent1}` : 'none',
                }}
              />
            ))}
          </div>
        </section>
      ) : (
        /* FRAME VARIANT - Light, structured, playful */
        <section className="relative overflow-hidden transition-all duration-700" style={{
          background: featuredGame.colors.bg,
        }}>
          {/* Colorful radial glows */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700">
            <div style={{
              position: 'absolute',
              width: 500,
              height: 300,
              left: '20%',
              top: '30%',
              background: `radial-gradient(ellipse, ${featuredGame.colors.glow1} 0%, transparent 60%)`,
              filter: 'blur(40px)',
            }} />
            <div style={{
              position: 'absolute',
              width: 500,
              height: 300,
              right: '20%',
              top: '40%',
              background: `radial-gradient(ellipse, ${featuredGame.colors.glow2} 0%, transparent 60%)`,
              filter: 'blur(40px)',
            }} />
            <div style={{
              position: 'absolute',
              width: 400,
              height: 250,
              left: '40%',
              bottom: '20%',
              background: 'radial-gradient(ellipse, rgba(255, 165, 0, 0.25) 0%, transparent 60%)',
              filter: 'blur(30px)',
            }} />
          </div>

          {/* Playful dots pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle, ${featuredGame.colors.glow1} 2px, transparent 2px), radial-gradient(circle, ${featuredGame.colors.glow2} 2px, transparent 2px)`,
            backgroundSize: '40px 40px, 60px 60px',
            backgroundPosition: '0 0, 20px 20px',
            opacity: 0.5,
          }} />

          {/* Top bar */}
          <div className="absolute top-6 left-[15%] right-[15%] h-3 rounded-full" style={{
            background: `linear-gradient(90deg, transparent 0%, ${featuredGame.colors.accent1} 20%, ${featuredGame.colors.accent1} 40%, transparent 41%, transparent 59%, ${featuredGame.colors.accent1} 60%, ${featuredGame.colors.accent1} 80%, transparent 100%)`,
            boxShadow: `0 4px 20px ${featuredGame.colors.glow1}`,
          }} />

          {/* Bottom bar */}
          <div className="absolute bottom-6 left-[20%] right-[20%] h-3 rounded-full" style={{
            background: `linear-gradient(90deg, ${featuredGame.colors.accent2} 0%, ${featuredGame.colors.accent2} 30%, transparent 31%, transparent 69%, ${featuredGame.colors.accent2} 70%, ${featuredGame.colors.accent2} 100%)`,
            boxShadow: `0 -4px 20px ${featuredGame.colors.glow2}`,
          }} />

          {/* Side accent bars */}
          <div className="absolute top-1/4 left-8 w-3 h-32 rounded-full hidden md:block" style={{
            background: `linear-gradient(180deg, ${featuredGame.colors.accent1} 0%, #FFA500 100%)`,
            boxShadow: `4px 0 20px ${featuredGame.colors.glow1}`,
          }} />
          <div className="absolute top-1/4 right-8 w-3 h-32 rounded-full hidden md:block" style={{
            background: `linear-gradient(180deg, ${featuredGame.colors.accent2} 0%, ${featuredGame.colors.accent1} 100%)`,
            boxShadow: `-4px 0 20px ${featuredGame.colors.glow2}`,
          }} />

          <div className="relative z-10 py-20 px-4 text-center">
            <div className="text-xs font-bold tracking-[0.3em] mb-4" style={{
              color: featuredGame.colors.accent1,
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}>NOW PLAYING</div>
            <h2 className="text-7xl md:text-9xl font-black mb-4 transition-all duration-500" style={{
              color: featuredGame.colors.title,
              textShadow: featuredGame.colors.titleShadow,
            }}>
              {featuredGame.name}
            </h2>
            <p className="text-xl tracking-[0.2em] mb-10 font-bold" style={{
              color: featuredGame.colors.tagline,
            }}>{featuredGame.tagline}</p>

            <Link
              href={featuredGame.href}
              className="relative z-10 inline-block px-14 py-6 rounded-full font-black text-2xl transition-all hover:scale-110 hover:rotate-1"
              style={{
                background: featuredGame.colors.button,
                color: 'white',
                boxShadow: `0 6px 0 ${featuredGame.colors.buttonShadow}, 0 10px 30px ${featuredGame.colors.glow1}`,
              }}
            >
              PLAY NOW
            </Link>

          </div>

          {/* Scattered decorative emojis across the hero */}
          {/* Top left cluster */}
          <span className="absolute top-12 left-[8%] text-7xl transform -rotate-12 opacity-90 hover:scale-110 transition-transform" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' }}>
            {featuredGame.decorations[0]}
          </span>
          <span className="absolute top-28 left-[18%] text-3xl transform rotate-20 opacity-70">
            {featuredGame.decorations[2]}
          </span>

          {/* Top right cluster */}
          <span className="absolute top-16 right-[10%] text-6xl transform rotate-12 opacity-90 hover:scale-110 transition-transform" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' }}>
            {featuredGame.decorations[3]}
          </span>
          <span className="absolute top-8 right-[22%] text-4xl transform -rotate-6 opacity-60 animate-pulse">
            {featuredGame.decorations[4]}
          </span>

          {/* Bottom left */}
          <span className="absolute bottom-20 left-[12%] text-5xl transform rotate-6 opacity-80" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.12))' }}>
            {featuredGame.decorations[1]}
          </span>
          <span className="absolute bottom-32 left-[5%] text-2xl transform -rotate-20 opacity-50">
            {featuredGame.decorations[4]}
          </span>

          {/* Bottom right */}
          <span className="absolute bottom-24 right-[8%] text-5xl transform -rotate-12 opacity-85 hover:scale-110 transition-transform" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.12))' }}>
            {featuredGame.decorations[0]}
          </span>
          <span className="absolute bottom-12 right-[20%] text-3xl transform rotate-25 opacity-60">
            {featuredGame.decorations[2]}
          </span>

          {/* Mid sides for depth */}
          <span className="absolute top-1/2 left-[3%] text-4xl transform -rotate-45 opacity-40 hidden md:block">
            {featuredGame.decorations[1]}
          </span>
          <span className="absolute top-1/2 right-[4%] text-4xl transform rotate-30 opacity-40 hidden md:block">
            {featuredGame.decorations[3]}
          </span>

          {/* Corner accents */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: featuredGame.colors.accent1 }} />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: featuredGame.colors.accent2 }} />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: '#FFA500' }} />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: featuredGame.colors.accent1 }} />

          {/* Pagination dots - bottom center */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {featuredGames.map((_, i) => (
              <button
                key={i}
                onClick={() => handleDotClick(i)}
                className="transition-all duration-300"
                style={{
                  width: i === featuredIndex ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === featuredIndex
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(0,0,0,0.2)',
                  boxShadow: i === featuredIndex
                    ? '0 2px 8px rgba(0,0,0,0.15)'
                    : 'none',
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Our Games */}
      <section className="py-16 px-4" style={{
        background: 'linear-gradient(180deg, #5C1A3D 0%, #4A1532 50%, #3A1028 100%)',
      }}>
        <h2 className="text-center text-3xl font-black mb-10">
          <span style={{ color: '#FF6BA8', textShadow: '0 0 30px rgba(255, 107, 168, 0.6)' }}>OUR GAMES</span>
        </h2>
        <GamesGrid />
      </section>

      {/* The Cast */}
      <section className="py-16 px-4" style={{
        background: 'linear-gradient(180deg, #1A1A2E 0%, #16162A 50%, #121226 100%)',
      }}>
        <h2 className="text-center text-3xl font-black mb-10">
          <span style={{ color: '#FF69B4', textShadow: '0 0 30px rgba(255, 105, 180, 0.7)' }}>THE CAST</span>
        </h2>
        <CastCarousel />
      </section>

      {/* The Pit */}
      <section className="py-16 px-4 relative overflow-hidden" style={{
        backgroundColor: '#0D1F1C',
        backgroundImage: `
          linear-gradient(90deg, transparent 49px, rgba(0, 255, 170, 0.08) 49px, rgba(0, 255, 170, 0.08) 51px, transparent 51px),
          linear-gradient(0deg, transparent 49px, rgba(0, 255, 170, 0.08) 49px, rgba(0, 255, 170, 0.08) 51px, transparent 51px),
          radial-gradient(circle at 50px 50px, rgba(0, 255, 170, 0.15) 2px, transparent 2px),
          linear-gradient(45deg, transparent 48%, rgba(0, 255, 170, 0.05) 49%, rgba(0, 255, 170, 0.05) 51%, transparent 52%),
          linear-gradient(-45deg, transparent 48%, rgba(0, 255, 170, 0.05) 49%, rgba(0, 255, 170, 0.05) 51%, transparent 52%)
        `,
        backgroundSize: '100px 100px, 100px 100px, 100px 100px, 50px 50px, 50px 50px',
      }}>
        <h2 className="text-center text-3xl font-black mb-4">
          <span style={{ color: '#00FFAA', textShadow: '0 0 30px rgba(0, 255, 170, 0.6)' }}>THE PIT</span>
        </h2>
        <p className="text-center text-sm text-gray-400 mb-10 max-w-md mx-auto">
          this is where ideas get weird. prototypes, dev transcripts, and half-baked experiments from the crew. join the chaos on{' '}
          <a href="https://discord.gg/659eJPUcjg" target="_blank" rel="noopener noreferrer" className="text-[#00FFAA] hover:underline">Discord</a>.
        </p>
        <LabGrid />
      </section>

      {/* Footer */}
      <footer className="py-8 text-center" style={{ backgroundColor: '#0A1614' }}>
        {/* Social Links */}
        <div className="flex justify-center gap-6 mb-6">
          <a
            href="https://discord.gg/659eJPUcjg"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Join our Discord"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </a>
          <a
            href="https://x.com/pixelpit_games"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Follow us on X"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>

        <p className="text-gray-400 text-sm">
          ★ TOKENS HARMED: YES ★
        </p>
        <p className="text-gray-500 text-xs mt-2">
          <span className="text-[#FF1493]">pixel</span><span className="text-[#00FFFF]">pit</span>.gg
        </p>
      </footer>
    </div>
  );
}
