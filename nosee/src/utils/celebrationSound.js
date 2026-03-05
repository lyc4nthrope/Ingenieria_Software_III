/**
 * celebrationSound.js
 * Reproduce una melodía corta de celebración usando Web Audio API.
 * No reproduce si las animaciones están pausadas (accesibilidad).
 */

export function playSuccessSound() {
  if (document.documentElement.classList.contains("a11y-pause-animations")) {
    return;
  }

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99]; // Do, Mi, Sol
    const duration = 0.12;
    const gap = 0.05;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.value = freq;

      const start = ctx.currentTime + i * (duration + gap);
      const end = start + duration;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.01);
      gain.gain.linearRampToValueAtTime(0, end);

      osc.start(start);
      osc.stop(end + 0.01);
    });
  } catch {
    // Ignorar errores de audio
  }
}
