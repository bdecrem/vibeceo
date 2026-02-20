/**
 * Game display names for Pixelpit Arcade.
 *
 * Used by the dynamic [game]/share/ routes for metadata and OG images.
 * Game slug (directory name) → uppercase display name.
 *
 * To add a new game: add one line here. That's it.
 */
export const GAME_NAMES: Record<string, string> = {
  ballz: 'BALLZ',
  batdash: 'BAT DASH',
  beam: 'BEAM',
  blast: 'BLAST',
  catch: 'CATCH',
  cattower: 'CAT TOWER',
  cavemoth: 'CAVE MOTH',
  chroma: 'CHROMA',
  climb: 'CLIMB',
  clump: 'CLUMP',
  crossy: 'CROSSY',
  devour: 'DEVOUR',
  drop: 'DROP',
  emoji: 'EMOJI BLASTER',
  flappy: 'FLAPPY',
  flip: 'FLIP',
  flop: 'FLOP',
  fold: 'FOLD',
  glop: 'GLOP',
  haunt: 'HAUNT',
  melt: 'MELT',
  melt2: 'MELT 2',
  melt3: 'MELT 3',
  orbit: 'ORBIT',
  paralysis: 'PARALYSIS',
  pixel: 'PIXEL',
  pour: 'POUR',
  puff: 'PUFF',
  rain: 'RAIN',
  seance: 'SÉANCE',
  sift: 'SIFT',
  singularity: 'SINGULARITY',
  slide: 'SLIDE',
  'sprout-run': 'SPROUT RUN',
  superbeam: 'SUPERBEAM',
  surge: 'SURGE',
  swarm: 'SWARM',
  swoop: 'SWOOP',
  'swoop-ci': 'SWOOP CI',
  'tap-beats': 'TAP BEATS',
  tapper: 'TAPPER',
  threads: 'THREADS',
  yertle: 'YERTLE',
};

/** Get display name for a game slug, or uppercase the slug as fallback. */
export function getGameName(slug: string): string {
  return GAME_NAMES[slug] || slug.toUpperCase().replace(/-/g, ' ');
}
