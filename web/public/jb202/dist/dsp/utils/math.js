/**
 * JB202 DSP Math Utilities
 * Common mathematical functions for audio synthesis
 */

// Two PI constant for phase calculations
export const TWO_PI = 2 * Math.PI;

// Clamp value between min and max
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Linear interpolation
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Convert decibels to linear amplitude
export function dbToLinear(db) {
  return Math.pow(10, db / 20);
}

// Convert linear amplitude to decibels
export function linearToDb(linear) {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

// Convert frequency to angular frequency (radians per sample)
export function freqToOmega(freq, sampleRate) {
  return (TWO_PI * freq) / sampleRate;
}

// Soft clip using tanh approximation (fast)
export function softClip(x, amount) {
  if (amount <= 0) return x;
  const k = amount * 50;
  return ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
}

// Tanh saturation (more accurate, slower)
export function tanhSaturate(x, drive) {
  if (drive <= 0) return x;
  return Math.tanh(x * (1 + drive * 3)) / Math.tanh(1 + drive * 3);
}

// Fast approximation of tanh for real-time use
export function fastTanh(x) {
  if (x < -3) return -1;
  if (x > 3) return 1;
  const x2 = x * x;
  return x * (27 + x2) / (27 + 9 * x2);
}

// Polynomial curve for parameter mapping (quadratic)
export function quadraticCurve(value, min, max) {
  const normalized = value * value;
  return min + normalized * (max - min);
}

// Exponential curve for frequency parameters
export function expCurve(value, min, max) {
  return min * Math.pow(max / min, value);
}

// Log curve (inverse of exp)
export function logCurve(value, min, max) {
  return Math.log(value / min) / Math.log(max / min);
}
