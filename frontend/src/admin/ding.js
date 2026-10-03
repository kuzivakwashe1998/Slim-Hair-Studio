// SLIM HAIR STUDIO signature tone — a three-note gold chime (E5 → G#5 → B5) with a soft bell tail.
// Synthesised with Web Audio so it works offline, needs no asset, and is unmistakably "the Slim ding".
let ctx;
export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx ||= new AC(); if (ctx.state === "suspended") ctx.resume(); return ctx;
  } catch { return null; }
}
function bell(freq, t0, dur, gain = 0.5) {
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o1.type = "sine"; o1.frequency.value = freq;
  o2.type = "triangle"; o2.frequency.value = freq * 2; // shimmer overtone
  f.type = "lowpass"; f.frequency.value = 3200;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o1.connect(f); o2.connect(f); f.connect(g); g.connect(ctx.destination);
  o1.start(t0); o2.start(t0); o1.stop(t0 + dur); o2.stop(t0 + dur);
}
export function playDing() {
  if (!unlockAudio()) { navigator.vibrate?.([80, 60, 80, 60, 200]); return; }
  const t = ctx.currentTime + 0.02;
  bell(659.25, t, 0.9, 0.45);        // E5
  bell(830.61, t + 0.14, 0.9, 0.40); // G#5
  bell(987.77, t + 0.28, 1.6, 0.50); // B5 — long tail
  bell(1318.5, t + 0.28, 1.2, 0.12); // E6 sparkle
  navigator.vibrate?.([80, 60, 80, 60, 200]);
}
