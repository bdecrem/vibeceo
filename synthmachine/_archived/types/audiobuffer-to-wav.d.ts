declare module 'audiobuffer-to-wav' {
  function audioBufferToWav(buffer: AudioBuffer, opt?: { float32?: boolean }): ArrayBuffer;
  export = audioBufferToWav;
}
