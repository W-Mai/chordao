// Guitar chord audio playback via Web Audio API with harmonic series
// Standard tuning frequencies (E2 A2 D3 G3 B3 E4)
const OPEN_FREQS = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

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

// Cancel all scheduled audio by replacing the context
export function resetAudio() {
  if (ctx) {
    ctx.close();
    ctx = null;
  }
}

function pluckString(ac: AudioContext, freq: number, startTime: number, dest: AudioNode, vol = 0.12) {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0);
  gain.connect(dest);

  for (const h of HARMONICS) {
    const hFreq = freq * h.n;
    if (hFreq > 8000) break;
    const osc = ac.createOscillator();
    const hGain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = hFreq;
    hGain.gain.setValueAtTime(h.amp * 0.15, startTime);
    hGain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.0 / h.n);
    osc.connect(hGain);
    hGain.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + 2.0 / h.n + 0.05);
  }
}

// Strum with optional string range: [from, to] inclusive (0=low E, 5=high E)
function strumAt(
  ac: AudioContext,
  frets: number[],
  time: number,
  dir: 'down' | 'up',
  vol = 0.12,
  strings: [number, number] = [0, 5],
) {
  const [lo, hi] = strings;
  const indices = [];
  for (let i = lo; i <= hi; i++) indices.push(i);
  const order = dir === 'down' ? indices : [...indices].reverse();
  order.forEach((i, idx) => {
    if (frets[i] < 0) return;
    const freq = OPEN_FREQS[i] * Math.pow(2, frets[i] / 12);
    pluckString(ac, freq, time + idx * 0.02, ac.destination, vol);
  });
}

// Arpeggio: play strings one by one
function arpeggioAt(ac: AudioContext, frets: number[], time: number, beatDur: number) {
  const playable = frets.map((f, i) => ({ f, i })).filter((x) => x.f >= 0);
  playable.forEach((x, idx) => {
    const freq = OPEN_FREQS[x.i] * Math.pow(2, x.f / 12);
    pluckString(ac, freq, time + idx * (beatDur / playable.length), ac.destination, 0.1);
  });
}

// Rhythm pattern: strums within one bar (4/4 time)
// Each entry: [beatOffset, direction, volume, strings?]
// strings: [from, to] — 0=lowE..5=highE, default all
export interface RhythmStrum {
  beat: number;
  dir: 'down' | 'up' | 'arp';
  vol: number;
  strings?: [number, number]; // [lo, hi], default [0,5]
}

export interface RhythmPattern {
  name: string;
  label: string;
  strums: RhythmStrum[];
}

// S = helper to create strum entries concisely
const S = (beat: number, dir: 'down' | 'up' | 'arp', vol: number, strings?: [number, number]): RhythmStrum => ({
  beat,
  dir,
  vol,
  strings,
});

export const RHYTHM_PATTERNS: RhythmPattern[] = [
  { name: 'whole', label: '𝅝', strums: [S(0, 'down', 1.0)] },

  {
    name: 'quarter',
    label: '♩♩♩♩',
    strums: [S(0, 'down', 1.0), S(1, 'down', 0.7), S(2, 'down', 0.8), S(3, 'down', 0.7)],
  },

  // Pop — D · DU · UDU, down=full, up=treble
  {
    name: 'pop',
    label: 'Pop',
    strums: [
      S(0, 'down', 1.0),
      S(1, 'down', 0.7),
      S(1.5, 'up', 0.5, [2, 5]),
      S(2.5, 'up', 0.5, [2, 5]),
      S(3, 'down', 0.7),
      S(3.5, 'up', 0.5, [2, 5]),
    ],
  },

  // Pop Rock — D · DUDUDU, up=treble
  {
    name: 'poprock',
    label: 'Pop Rock',
    strums: [
      S(0, 'down', 1.0),
      S(1, 'down', 0.7),
      S(1.5, 'up', 0.5, [2, 5]),
      S(2, 'down', 0.8),
      S(2.5, 'up', 0.5, [2, 5]),
      S(3, 'down', 0.7),
      S(3.5, 'up', 0.5, [2, 5]),
    ],
  },

  // Ballad — bass note + treble up strums
  {
    name: 'ballad',
    label: 'Ballad',
    strums: [
      S(0, 'down', 1.0, [0, 2]),
      S(1, 'up', 0.4, [3, 5]),
      S(1.5, 'up', 0.3, [3, 5]),
      S(2, 'down', 0.6, [0, 2]),
      S(2.5, 'up', 0.4, [3, 5]),
      S(3, 'down', 0.5, [2, 5]),
    ],
  },

  // Folk — bass alternating + treble strums
  {
    name: 'folk',
    label: 'Folk',
    strums: [
      S(0, 'down', 1.0, [0, 2]),
      S(0.5, 'up', 0.3, [3, 5]),
      S(1, 'down', 0.6, [3, 5]),
      S(1.5, 'up', 0.4, [3, 5]),
      S(2, 'down', 0.8, [0, 2]),
      S(2.5, 'up', 0.3, [3, 5]),
      S(3, 'down', 0.6, [3, 5]),
      S(3.5, 'up', 0.4, [3, 5]),
    ],
  },

  // Rock — heavy down, light up on treble
  {
    name: 'rock',
    label: 'Rock',
    strums: [
      S(0, 'down', 1.0),
      S(1, 'down', 0.9),
      S(1.5, 'up', 0.5, [2, 5]),
      S(2.5, 'up', 0.5, [2, 5]),
      S(3, 'down', 0.9),
    ],
  },

  // Punk — all eighth notes, full strum, aggressive
  {
    name: 'punk',
    label: 'Punk',
    strums: [
      S(0, 'down', 1.0),
      S(0.5, 'up', 0.8),
      S(1, 'down', 0.9),
      S(1.5, 'up', 0.8),
      S(2, 'down', 1.0),
      S(2.5, 'up', 0.8),
      S(3, 'down', 0.9),
      S(3.5, 'up', 0.8),
    ],
  },

  // Reggae — offbeat upstrokes, treble only
  {
    name: 'reggae',
    label: 'Reggae',
    strums: [
      S(0.5, 'up', 0.8, [2, 5]),
      S(1.5, 'up', 0.8, [2, 5]),
      S(2.5, 'up', 0.8, [2, 5]),
      S(3.5, 'up', 0.8, [2, 5]),
    ],
  },

  // Shuffle — triplet feel
  {
    name: 'shuffle',
    label: 'Shuffle',
    strums: [
      S(0, 'down', 1.0),
      S(0.67, 'up', 0.5, [2, 5]),
      S(1, 'down', 0.7),
      S(1.67, 'up', 0.5, [2, 5]),
      S(2, 'down', 0.8),
      S(2.67, 'up', 0.5, [2, 5]),
      S(3, 'down', 0.7),
      S(3.67, 'up', 0.5, [2, 5]),
    ],
  },

  // Country — bass-strum alternating
  {
    name: 'country',
    label: 'Country',
    strums: [
      S(0, 'down', 1.0, [0, 2]),
      S(1, 'down', 0.7, [2, 5]),
      S(1.5, 'up', 0.4, [3, 5]),
      S(2, 'down', 0.8, [0, 2]),
      S(2.5, 'up', 0.4, [3, 5]),
      S(3, 'down', 0.7, [2, 5]),
      S(3.5, 'up', 0.4, [3, 5]),
    ],
  },

  // Arpeggio
  { name: 'arpeggio', label: 'Arp ♫', strums: [S(0, 'arp', 1.0), S(2, 'arp', 0.8)] },
];

// Play a single chord (click)
export function playChord(frets: number[]) {
  const ac = getCtx();
  strumAt(ac, frets, ac.currentTime, 'down');
}

// Schedule a full bar of rhythm for a chord
export function scheduleBar(frets: number[], bpm: number, pattern: RhythmPattern) {
  const ac = getCtx();
  const beatDur = 60 / bpm;
  const now = ac.currentTime;
  for (const s of pattern.strums) {
    const t = now + s.beat * beatDur;
    if (s.dir === 'arp') {
      arpeggioAt(ac, frets, t, beatDur);
    } else {
      strumAt(ac, frets, t, s.dir, s.vol * 0.12, s.strings);
    }
  }
}
