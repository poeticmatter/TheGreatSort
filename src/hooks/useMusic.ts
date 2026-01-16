import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';

// --- Music Data (from provided snippet) ---
const melody = [
  {"time":"0:0:0","note":"A4","duration":"4n"},{"time":"0:1:0","note":"B4","duration":"8n"},{"time":"0:1:2","note":"C5","duration":"8n"},{"time":"0:2:0","note":"C5","duration":"4n"},{"time":"0:3:0","note":"A4","duration":"4n"},{"time":"1:0:0","note":"C5","duration":"4n"},{"time":"1:1:0","note":"C5","duration":"8n"},{"time":"1:1:2","note":"D5","duration":"8n"},{"time":"1:2:0","note":"D5","duration":"4n"},{"time":"1:3:0","note":"B4","duration":"4n"},{"time":"2:0:0","note":"E5","duration":"4n"},{"time":"2:1:0","note":"E5","duration":"8n"},{"time":"2:1:2","note":"F5","duration":"8n"},{"time":"2:2:0","note":"G5","duration":"4n"},{"time":"2:3:0","note":"E5","duration":"4n"},{"time":"3:0:0","note":"E5","duration":"4n"},{"time":"3:1:0","note":"D5","duration":"8n"},{"time":"3:1:2","note":"C5","duration":"8n"},{"time":"3:2:0","note":"B4","duration":"2n"},{"time":"4:0:0","note":"A5","duration":"4n"},{"time":"4:1:0","note":"G5","duration":"8n"},{"time":"4:1:2","note":"F5","duration":"8n"},{"time":"4:2:0","note":"F5","duration":"4n"},{"time":"4:3:0","note":"A4","duration":"4n"},{"time":"5:0:0","note":"D5","duration":"4n"},{"time":"5:1:0","note":"F5","duration":"8n"},{"time":"5:1:2","note":"E5","duration":"8n"},{"time":"5:2:0","note":"D5","duration":"4n"},{"time":"5:3:0","note":"C5","duration":"4n"},{"time":"6:0:0","note":"C5","duration":"4n"},{"time":"6:1:0","note":"D5","duration":"8n"},{"time":"6:1:2","note":"E5","duration":"8n"},{"time":"6:2:0","note":"E5","duration":"4n"},{"time":"6:3:0","note":"A4","duration":"4n"},{"time":"7:0:0","note":"C5","duration":"4n"},{"time":"7:1:0","note":"B4","duration":"8n"},{"time":"7:1:2","note":"A4","duration":"8n"},{"time":"7:2:0","note":"A4","duration":"2n"}
];

const bass = [
  {"time":"0:0:0","note":"A2","duration":"2n"},{"time":"0:2:0","note":"E2","duration":"2n"},{"time":"1:0:0","note":"A2","duration":"2n"},{"time":"1:2:0","note":"E2","duration":"2n"},{"time":"2:0:0","note":"C3","duration":"2n"},{"time":"2:2:0","note":"G2","duration":"2n"},{"time":"3:0:0","note":"E2","duration":"2n"},{"time":"3:2:0","note":"E2","duration":"2n"},{"time":"4:0:0","note":"D3","duration":"2n"},{"time":"4:2:0","note":"A2","duration":"2n"},{"time":"5:0:0","note":"D3","duration":"2n"},{"time":"5:2:0","note":"A2","duration":"2n"},{"time":"6:0:0","note":"A2","duration":"2n"},{"time":"6:2:0","note":"E2","duration":"2n"},{"time":"7:0:0","note":"E2","duration":"2n"},{"time":"7:2:0","note":"A2","duration":"2n"}
];

const tempo = 120;
const synthType = "sine";
const bassSynthType = "square";

export function useMusic() {
  // Initialize state from localStorage (defaulting to false)
  const [isPlaying, setIsPlaying] = useState(() => {
    try {
      const stored = localStorage.getItem('music_enabled');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const initialized = useRef(false);

  // Initialize Tone.js entities once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // We can setup the instruments immediately, but we must not start Transport yet.
    // However, AudioContext might be suspended.

    // --- Effects Chain ---
    const reverb = new Tone.Reverb({
      decay: 2.5,
      preDelay: 0.1,
      wet: 0.3
    }).toDestination();
    reverb.generate(); // Ensure reverb tail is generated (async, but fire-and-forget here is usually ok, or we wait)

    const delay = new Tone.FeedbackDelay("8n", 0.4).connect(reverb);
    const dist = new Tone.Distortion(0.1).connect(delay);
    const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(dist).start();

    // --- Synth Setup ---
    const poly = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: synthType },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
    });
    poly.connect(chorus);
    poly.connect(reverb);

    // --- Bass Setup ---
    const bassSynth = new Tone.MonoSynth({
      oscillator: { type: bassSynthType },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
      filterEnvelope: { attack: 0.001, decay: 0.7, sustain: 0.1, baseFrequency: 200, octaves: 4 }
    });
    bassSynth.connect(reverb);

    // --- Scheduling ---
    const melodyPart = new Tone.Part((time: number, noteInfo: any) => {
      poly.triggerAttackRelease(noteInfo.note, noteInfo.duration, time);
    }, melody).start(0);
    melodyPart.loop = true;
    melodyPart.loopEnd = "8:0:0";

    const bassPart = new Tone.Part((time: number, noteInfo: any) => {
      bassSynth.triggerAttackRelease(noteInfo.note, noteInfo.duration, time, 0.6);
    }, bass).start(0);
    bassPart.loop = true;
    bassPart.loopEnd = "8:0:0";

    Tone.Transport.bpm.value = tempo;

    return () => {
      // Cleanup if unmounted (though useMusic is likely global)
      melodyPart.dispose();
      bassPart.dispose();
      poly.dispose();
      bassSynth.dispose();
      chorus.dispose();
      dist.dispose();
      delay.dispose();
      reverb.dispose();
    };
  }, []);

  // Handle Play/Stop logic
  useEffect(() => {
    // If playing is requested
    if (isPlaying) {
      // Check if Context is running
      if (Tone.context.state !== 'running') {
        // We cannot start it programmatically without gesture usually.
        // We attach a one-time listener to document to start it.
        const startAudio = async () => {
          await Tone.start();
          // Check isPlaying again via ref or just ensure we don't start if unmounted/toggled
          // However, since Tone.Transport is global, we can just start it.
          // If the user toggled it off while this was pending, the cleanup or next render will stop it.
          // But to be safe, we rely on the cleanup below to remove this listener if isPlaying flips to false.
          Tone.Transport.start();
          document.removeEventListener('click', startAudio);
          document.removeEventListener('keydown', startAudio);
        };

        document.addEventListener('click', startAudio);
        document.addEventListener('keydown', startAudio);

        return () => {
          document.removeEventListener('click', startAudio);
          document.removeEventListener('keydown', startAudio);
        };
      } else {
        Tone.Transport.start();
      }
    } else {
      Tone.Transport.stop();
    }
  }, [isPlaying]);

  const toggleMusic = async () => {
    // If we are turning it ON, we might need to resume context right here (user gesture)
    if (!isPlaying) {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
      setIsPlaying(true);
      localStorage.setItem('music_enabled', 'true');
    } else {
      setIsPlaying(false);
      localStorage.setItem('music_enabled', 'false');
    }
  };

  return { isPlaying, toggleMusic };
}
