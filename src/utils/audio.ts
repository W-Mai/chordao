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

// Strum direction: 'down' = low→high, 'up' = high→low
function strumAt(ac: AudioContext, frets: number[], time: number, dir: 'down' | 'up', vol = 0.12) {
  const order = dir === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
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
// Each entry: [beatOffset (0-4), direction, volume multiplier]
export interface RhythmPattern {
  name: string;
  label: string;
  strums: [number, 'down' | 'up' | 'arp', number][];
}

// D=down U=up -=rest x=mute
// Beat positions: 1=0, 1+=0.5, 2=1, 2+=1.5, 3=2, 3+=2.5, 4=3, 4+=3.5
export const RHYTHM_PATTERNS: RhythmPattern[] = [
  // Whole note — one strum per bar
  { name: 'whole', label: '𝅝', strums: [[0, 'down', 1.0]] },

  // Quarter — D D D D
  {
    name: 'quarter',
    label: '♩♩♩♩',
    strums: [
      [0, 'down', 1.0],
      [1, 'down', 0.7],
      [2, 'down', 0.8],
      [3, 'down', 0.7],
    ],
  },

  // Pop/Folk — D · D U · U D U (the universal pattern)
  {
    name: 'pop',
    label: 'Pop',
    strums: [
      [0, 'down', 1.0],
      [1, 'down', 0.7],
      [1.5, 'up', 0.5],
      [2.5, 'up', 0.5],
      [3, 'down', 0.7],
      [3.5, 'up', 0.5],
    ],
  },

  // Pop Rock — D · D U D U D U
  {
    name: 'poprock',
    label: 'Pop Rock',
    strums: [
      [0, 'down', 1.0],
      [1, 'down', 0.7],
      [1.5, 'up', 0.5],
      [2, 'down', 0.8],
      [2.5, 'up', 0.5],
      [3, 'down', 0.7],
      [3.5, 'up', 0.5],
    ],
  },

  // Ballad — D · · U · U D ·
  {
    name: 'ballad',
    label: 'Ballad',
    strums: [
      [0, 'down', 1.0],
      [1.5, 'up', 0.4],
      [2.5, 'up', 0.5],
      [3, 'down', 0.6],
    ],
  },

  // Folk fingerpicking style — D · D U · U D U (accented 1 and 3)
  {
    name: 'folk',
    label: 'Folk',
    strums: [
      [0, 'down', 1.0],
      [1, 'down', 0.5],
      [1.5, 'up', 0.4],
      [2, 'down', 0.8],
      [2.5, 'up', 0.4],
      [3, 'down', 0.5],
      [3.5, 'up', 0.4],
    ],
  },

  // Rock — D D · U · U D ·
  {
    name: 'rock',
    label: 'Rock',
    strums: [
      [0, 'down', 1.0],
      [1, 'down', 0.8],
      [1.5, 'up', 0.5],
      [2.5, 'up', 0.6],
      [3, 'down', 0.8],
    ],
  },

  // Punk — D U D U D U D U (all eighth notes, aggressive)
  {
    name: 'punk',
    label: 'Punk',
    strums: [
      [0, 'down', 1.0],
      [0.5, 'up', 0.7],
      [1, 'down', 0.9],
      [1.5, 'up', 0.7],
      [2, 'down', 1.0],
      [2.5, 'up', 0.7],
      [3, 'down', 0.9],
      [3.5, 'up', 0.7],
    ],
  },

  // Reggae skank — · U · U · U · U (offbeat upstrokes)
  {
    name: 'reggae',
    label: 'Reggae',
    strums: [
      [0.5, 'up', 0.8],
      [1.5, 'up', 0.8],
      [2.5, 'up', 0.8],
      [3.5, 'up', 0.8],
    ],
  },

  // Shuffle/Swing — D · U D · U D · U D · U (triplet feel)
  {
    name: 'shuffle',
    label: 'Shuffle',
    strums: [
      [0, 'down', 1.0],
      [0.67, 'up', 0.5],
      [1, 'down', 0.7],
      [1.67, 'up', 0.5],
      [2, 'down', 0.8],
      [2.67, 'up', 0.5],
      [3, 'down', 0.7],
      [3.67, 'up', 0.5],
    ],
  },

  // Country train beat — D x D U x U D U
  {
    name: 'country',
    label: 'Country',
    strums: [
      [0, 'down', 1.0],
      [1, 'down', 0.7],
      [1.5, 'up', 0.5],
      [2.5, 'up', 0.5],
      [3, 'down', 0.7],
      [3.5, 'up', 0.4],
    ],
  },

  // Arpeggio — fingerpick across 4 beats
  {
    name: 'arpeggio',
    label: 'Arp ♫',
    strums: [
      [0, 'arp', 1.0],
      [2, 'arp', 0.8],
    ],
  },
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
  for (const [beat, dir, vol] of pattern.strums) {
    const t = now + beat * beatDur;
    if (dir === 'arp') {
      arpeggioAt(ac, frets, t, beatDur);
    } else {
      strumAt(ac, frets, t, dir, vol * 0.12);
    }
  }
}
