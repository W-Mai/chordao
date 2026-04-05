// Guitar chord audio playback via Web Audio API with harmonic series
// Standard tuning frequencies (E2 A2 D3 G3 B3 E4)
const OPEN_FREQS = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

// Harmonic amplitudes for plucked string (Karplus-Strong-like spectrum)
// Higher harmonics decay faster, odd harmonics slightly stronger
const HARMONICS = [
  { n: 1, amp: 1.0 },
  { n: 2, amp: 0.5 },
  { n: 3, amp: 0.35 },
  { n: 4, amp: 0.2 },
  { n: 5, amp: 0.15 },
  { n: 6, amp: 0.08 },
  { n: 7, amp: 0.06 },
  { n: 8, amp: 0.03 },
];

let ctx: AudioContext | null = null;
function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

// Play a single string with harmonic series + pluck envelope
function pluckString(ac: AudioContext, freq: number, startTime: number, dest: AudioNode) {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.12, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);
  gain.connect(dest);

  for (const h of HARMONICS) {
    const hFreq = freq * h.n;
    if (hFreq > 8000) break; // skip inaudible harmonics
    const osc = ac.createOscillator();
    const hGain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = hFreq;
    // Higher harmonics decay faster
    hGain.gain.setValueAtTime(h.amp * 0.15, startTime);
    hGain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0 / h.n);
    osc.connect(hGain);
    hGain.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + 2.0 / h.n + 0.05);
  }
}

// Play a chord given fret positions per string
export function playChord(frets: number[]) {
  const ac = getCtx();
  const now = ac.currentTime;
  frets.forEach((fret, i) => {
    if (fret < 0) return; // muted
    const freq = OPEN_FREQS[i] * Math.pow(2, fret / 12);
    pluckString(ac, freq, now + i * 0.03, ac.destination);
  });
}
