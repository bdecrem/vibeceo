declare module 'web-audio-api' {
  export const AudioContext: typeof globalThis.AudioContext;
  export const OfflineAudioContext: typeof globalThis.OfflineAudioContext;
}
