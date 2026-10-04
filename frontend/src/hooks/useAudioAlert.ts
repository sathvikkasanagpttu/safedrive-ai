"use client";

import { useState, useRef, useCallback } from "react";

export function useAudioAlert() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastAlertTime = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
  };

  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = "sine") => {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }

      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [soundEnabled]);

  const triggerAlertSound = useCallback((severity: string) => {
    if (!soundEnabled) return;
    const now = Date.now();
    // Cooldown 2.5 seconds between audio sounds
    if (now - lastAlertTime.current < 2500) return;
    lastAlertTime.current = now;

    if (severity === "critical") {
      // High urgency siren tone
      playTone(1050, 0.25, "triangle");
      setTimeout(() => playTone(1250, 0.35, "triangle"), 250);
    } else if (severity === "high") {
      playTone(880, 0.25, "sine");
      setTimeout(() => playTone(880, 0.25, "sine"), 200);
    } else if (severity === "warning") {
      playTone(660, 0.2, "sine");
    }
  }, [soundEnabled, playTone]);

  return {
    soundEnabled,
    setSoundEnabled,
    triggerAlertSound
  };
}
