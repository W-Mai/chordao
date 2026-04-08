// Guitar chord audio playback via Web Audio API with harmonic series
// Standard tuning frequencies (E2 A2 D3 G3 B3 E4)
const OPEN_FREQS = [82.41, 110.0, 146.83, 196.0, 246.94, 329.63];

// Harmonic amplitudes based on plucked string physics
// Reference: Perov et al. "The physics of guitar string vibrations"
// American Journal of Physics 84(1):38-43, 2016
// b_n = sin(n*pi*x1/L) / (n^2 * (x1/L) * (1 - x1/L) * pi^2)
// x1/L ≈ 0.17 typical guitar pluck position (between bridge and soundhole)
// Decay time for nth harmonic ∝ 1/n (Karplus-Strong model)
const PLUCK_POS = 0.17; // x1/L ratio
const NUM_HARMONICS = 12;

let ctx: AudioContext | null = null;
function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function resetAudio() {
  if (ctx) {
    ctx.close();
    ctx = null;
  }
}

function harmonicAmp(n: number): number {
  const x = PLUCK_POS;
  return Math.sin(n * Math.PI * x) / (n * n * x * (1 - x) * Math.PI * Math.PI);
}

function pluckString(ac: AudioContext, freq: number, startTime: number, dest: AudioNode, vol = 0.12, decay = 2.5) {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
  gain.connect(dest);

  const b1 = harmonicAmp(1);
  for (let n = 1; n <= NUM_HARMONICS; n++) {
    const hFreq = freq * n;
    if (hFreq > 10000) break;
    const amp = Math.abs(harmonicAmp(n) / b1); // normalize to fundamental
    if (amp < 0.01) continue; // skip negligible harmonics
    const osc = ac.createOscillator();
    const hGain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = hFreq;
    hGain.gain.setValueAtTime(amp * 0.15, startTime);
    // Higher harmonics decay faster: τ_n ∝ 1/n
    const decayTime = decay / n;
    hGain.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);
    osc.connect(hGain);
    hGain.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + decayTime + 0.05);
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

// Classic fingerpicking: 53231323 (string numbers, 1=high e, 6=low E)
// Maps to array indices: 5→1(A), 3→3(G), 2→4(B), 1→5(e)
const ARPEGGIO_PATTERN = [1, 3, 4, 3, 5, 3, 4, 3]; // 53231323: string5=A,3=G,2=B,3=G,1=e,3=G,2=B,3=G

function arpeggioAt(ac: AudioContext, frets: number[], time: number, barDur: number) {
  const step = barDur / ARPEGGIO_PATTERN.length;
  ARPEGGIO_PATTERN.forEach((si, idx) => {
    if (frets[si] < 0) return;
    const freq = OPEN_FREQS[si] * Math.pow(2, frets[si] / 12);
    pluckString(ac, freq, time + idx * step, ac.destination, 0.1);
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
  { name: 'arpeggio', label: '53231323', strums: [S(0, 'arp', 1.0)] },
];

// Play a single chord (click)
export function playChord(frets: number[]) {
  const ac = getCtx();
  strumAt(ac, frets, ac.currentTime, 'down');
}

// Schedule a full bar of rhythm for a chord
export function scheduleBar(frets: number[], bpm: number, pattern: RhythmPattern, startTime?: number) {
  const ac = getCtx();
  const beatDur = 60 / bpm;
  const now = startTime ?? ac.currentTime;
  for (const s of pattern.strums) {
    const t = now + s.beat * beatDur;
    if (s.dir === 'arp') {
      arpeggioAt(ac, frets, t, beatDur * 4);
    } else {
      strumAt(ac, frets, t, s.dir, s.vol * 0.12, s.strings);
    }
  }
}

export function audioNow(): number {
  return getCtx().currentTime;
}
