import * as Tone from 'tone';

let isMuted = false;
let initialized = false;

// Synthesizers
let clickSynth: Tone.MembraneSynth | null = null;
let shakeSynth: Tone.MetalSynth | null = null;
let scoreSynth: Tone.PolySynth | null = null;
let winSynth: Tone.PolySynth | null = null;

let shakeTimeoutIds: number[] = [];
let winTimeoutIds: number[] = [];

export async function initAudio(): Promise<void> {
  if (initialized) return;
  try {
    await Tone.start();
    
    clickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 1,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();
    clickSynth.volume.value = -10;

    shakeSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    shakeSynth.volume.value = -20;

    scoreSynth = new Tone.PolySynth(Tone.FMSynth, {
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 1 },
    }).toDestination();
    scoreSynth.volume.value = -15;

    winSynth = new Tone.PolySynth(Tone.AMSynth, {
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 2 },
    }).toDestination();
    winSynth.volume.value = -5;

    initialized = true;
  } catch (e) {
    console.warn('Audio initialization failed:', e);
  }
}

export function toggleMute(): boolean {
  isMuted = !isMuted;
  Tone.Destination.mute = isMuted;
  return isMuted;
}

export function getIsMuted(): boolean {
  return isMuted;
}

export function playClick(): void {
  if (!initialized || isMuted) return;
  try {
    clickSynth?.triggerAttackRelease('C2', '32n');
  } catch (e) {
    console.warn('Audio playClick error:', e);
  }
}

export function playShake(): void {
  if (!initialized || isMuted) return;
  try {
    // Clear any pending rattle timeouts from previous rolls
    shakeTimeoutIds.forEach((id) => clearTimeout(id));
    shakeTimeoutIds = [];

    // Trigger immediate shake strike
    shakeSynth?.triggerAttackRelease(200, '32n');

    // Rattle bursts using setTimeout so Tone triggers at real-time
    // avoiding Tone.Source timeline collision: "Start time must be strictly greater than previous start time"
    const delays = [60, 130, 200];
    delays.forEach((delay) => {
      const id = window.setTimeout(() => {
        if (!initialized || isMuted) return;
        try {
          shakeSynth?.triggerAttackRelease(200, '32n');
        } catch {
          // Ignore any audio glitch
        }
      }, delay);
      shakeTimeoutIds.push(id);
    });
  } catch (e) {
    console.warn('Audio playShake error:', e);
  }
}

export function playScore(): void {
  if (!initialized || isMuted) return;
  try {
    scoreSynth?.triggerAttackRelease(['C5', 'E5', 'G5'], '8n');
  } catch (e) {
    console.warn('Audio playScore error:', e);
  }
}

export function playWin(): void {
  if (!initialized || isMuted) return;
  try {
    winTimeoutIds.forEach((id) => clearTimeout(id));
    winTimeoutIds = [];

    winSynth?.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '4n');

    const chords: [string[], string, number][] = [
      [['F4', 'A4', 'C5', 'F5'], '4n', 450],
      [['G4', 'B4', 'D5', 'G5'], '4n', 900],
      [['C4', 'E4', 'G4', 'C5'], '2n', 1350],
    ];

    chords.forEach(([notes, dur, delay]) => {
      const id = window.setTimeout(() => {
        if (!initialized || isMuted) return;
        try {
          winSynth?.triggerAttackRelease(notes, dur);
        } catch {}
      }, delay);
      winTimeoutIds.push(id);
    });
  } catch (e) {
    console.warn('Audio playWin error:', e);
  }
}
