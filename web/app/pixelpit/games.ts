export type GameCategory = 'all' | 'action' | 'puzzle' | 'rhythm' | 'arcade';

export type Game = {
  icon: string;
  name: string;
  href: string;
  playable: boolean;
  date: string;
  category: GameCategory;
};

export const games: Game[] = [
  { icon: '🫧', name: 'Pop Cult', href: '/pixelpit/arcade/popcult', playable: true, date: 'Mon 3/16', category: 'action' },
  { icon: '⚖️', name: 'Level', href: '/pixelpit/arcade/level', playable: true, date: 'Sun 3/15', category: 'puzzle' },
  { icon: '🍣', name: 'Sushi Mgr', href: '/pixelpit/arcade/sushi-manager', playable: true, date: 'Fri 3/13', category: 'arcade' },
  { icon: '🍣', name: 'Sushi', href: '/pixelpit/arcade/sushi', playable: true, date: 'Fri 3/13', category: 'puzzle' },
  { icon: '🎨', name: 'Flood', href: '/pixelpit/arcade/flood', playable: true, date: 'Mon 3/9', category: 'puzzle' },
  { icon: '🎯', name: 'Slingshot', href: '/pixelpit/arcade/slingshot', playable: true, date: 'Mon 3/2', category: 'action' },
  { icon: '🎯', name: 'Bullseye', href: '/pixelpit/arcade/bullseye', playable: true, date: 'Sun 3/1', category: 'action' },
  { icon: '💨', name: 'Dash', href: '/pixelpit/arcade/dash', playable: true, date: 'Wed 2/25', category: 'action' },
  { icon: '✨', name: 'Shine', href: '/pixelpit/arcade/shine', playable: true, date: 'Mon 2/23', category: 'puzzle' },
  { icon: '✂️', name: 'Snip', href: '/pixelpit/arcade/snip', playable: true, date: 'Fri 2/20', category: 'action' },
  { icon: '🧲', name: 'Clump', href: '/pixelpit/arcade/clump', playable: true, date: 'Thu 2/19', category: 'puzzle' },
  { icon: '🕳️', name: 'Devour', href: '/pixelpit/arcade/devour', playable: true, date: 'Wed 2/18', category: 'arcade' },
  { icon: '👾', name: 'Blast', href: '/pixelpit/arcade/blast', playable: true, date: 'Tue 2/17', category: 'action' },
  { icon: '🧊', name: 'Melt', href: '/pixelpit/arcade/melt', playable: true, date: 'Fri 2/13', category: 'puzzle' },
  { icon: '🧵', name: 'Threads', href: '/pixelpit/arcade/threads', playable: true, date: 'Thu 2/12', category: 'puzzle' },
  { icon: '🐦', name: 'Swoop CI', href: '/pixelpit/arcade/swoop-ci', playable: true, date: 'Wed 2/11', category: 'action' },
  { icon: '🐦', name: 'Swoop', href: '/pixelpit/arcade/swoop', playable: true, date: 'Tue 2/10', category: 'action' },
  { icon: '🛸', name: 'Orbit', href: '/pixelpit/arcade/orbit', playable: true, date: 'Mon 2/9', category: 'arcade' },
  { icon: '🌀', name: 'Drop', href: '/pixelpit/arcade/drop', playable: true, date: 'Fri 2/6', category: 'puzzle' },
  { icon: '🦋', name: 'Cave Moth', href: '/pixelpit/arcade/cavemoth', playable: true, date: 'Thu 2/5', category: 'action' },
  { icon: '🦇', name: 'Bat Dash', href: '/pixelpit/arcade/batdash', playable: true, date: 'Wed 2/4', category: 'action' },
  { icon: '🥁', name: 'Tap Beats', href: '/pixelpit/arcade/tap-beats', playable: true, date: 'Wed 2/4', category: 'rhythm' },
  { icon: '🌱', name: 'Sprout Run', href: '/pixelpit/arcade/sprout-run', playable: true, date: 'Tue 2/3', category: 'action' },
  { icon: '🐱', name: 'Cat Tower', href: '/pixelpit/arcade/cattower', playable: true, date: 'Sat 1/31', category: 'puzzle' },
  { icon: '💥', name: 'Emoji Blaster', href: '/pixelpit/arcade/emoji', playable: true, date: 'Fri 1/30', category: 'action' },
  { icon: '⚡', name: 'Beam', href: '/pixelpit/arcade/beam', playable: true, date: 'Thu 1/29', category: 'action' },
  { icon: '🌀', name: 'Singularity', href: '/pixelpit/arcade/singularity', playable: true, date: 'Wed 1/28', category: 'arcade' },
];

export const CATEGORIES: { id: GameCategory; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'action', label: 'ACTION' },
  { id: 'puzzle', label: 'PUZZLE' },
  { id: 'arcade', label: 'ARCADE' },
  { id: 'rhythm', label: 'RHYTHM' },
];

/** Deterministic game of the day based on date string hash */
export function getGameOfTheDay(dateStr?: string): Game {
  const playable = games.filter((g) => g.playable);
  const key = dateStr ?? new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) & 0xffffffff;
  }
  const index = Math.abs(hash) % playable.length;
  return playable[index];
}
