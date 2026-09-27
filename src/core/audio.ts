import * as Tone from 'tone';

let isMuted = false;
let initialized = false;

// Synthesizers
let clickSynth: Tone.MembraneSynth | null = null;
let shakeSynth: Tone.MetalSynth | null = null;
let scoreSynth: Tone.PolySynth | null = null;
let winSynth: Tone.PolySynth | null = null;

export async function initAudio(): Promise<void> {
  if (initialized) return;
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
  clickSynth?.triggerAttackRelease('C2', '32n');
}

export function playShake(): void {
  if (!initialized || isMuted) return;
  // Play a quick burst of metallic sounds
  const now = Tone.now();
  shakeSynth?.triggerAttackRelease('32n', now);
  shakeSynth?.triggerAttackRelease('32n', now + 0.1);
  shakeSynth?.triggerAttackRelease('32n', now + 0.2);
  shakeSynth?.triggerAttackRelease('32n', now + 0.3);
}

export function playScore(): void {
  if (!initialized || isMuted) return;
  const now = Tone.now();
  scoreSynth?.triggerAttackRelease(['C5', 'E5', 'G5'], '8n', now);
}

export function playWin(): void {
  if (!initialized || isMuted) return;
  const now = Tone.now();
  winSynth?.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '4n', now);
  winSynth?.triggerAttackRelease(['F4', 'A4', 'C5', 'F5'], '4n', now + 0.5);
  winSynth?.triggerAttackRelease(['G4', 'B4', 'D5', 'G5'], '4n', now + 1);
  winSynth?.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '2n', now + 1.5);
}
