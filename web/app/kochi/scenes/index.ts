// Scene registry - import all scenes here for programmatic selection
export { default as HavenScene } from './haven';
export { default as SnowFantasyScene } from './snowfantasy';
// export { default as IzakayaScene } from './izakaya';
// export { default as TokyoScene } from './tokyo';

// Scene list for random/programmatic selection
export const scenes = {
  'haven': () => import('./haven'),
  'snowfantasy': () => import('./snowfantasy'),
  // 'izakaya': () => import('./izakaya'),
  // 'tokyo': () => import('./tokyo'),
} as const;

export type SceneId = keyof typeof scenes;
