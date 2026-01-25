// Minimalist sound effects for run_g2

export class SoundEffects {
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new AudioContext();
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playCorrectSelection() {
    this.playTone(440, 0.1); // A4 note, short duration
  }

  playIncorrectSelection() {
    this.playTone(220, 0.2, 'triangle'); // Lower, slightly harsher tone
  }

  playGameOver() {
    this.playTone(110, 0.5, 'sawtooth'); // Low, rough tone signaling end
  }

  playRestart() {
    this.playTone(660, 0.15); // Bright, hopeful tone
  }
}