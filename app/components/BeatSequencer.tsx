"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const STEPS = 16;
const DRUMS = [
  { id: "kick", label: "Kick" },
  { id: "snare", label: "Snare" },
  { id: "hihat", label: "Hi-Hat" },
  { id: "clap", label: "Clap" },
];

export default function BeatSequencer() {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [grid, setGrid] = useState<Record<string, boolean[]>>(() =>
    DRUMS.reduce(
      (acc, drum) => ({ ...acc, [drum.id]: Array(STEPS).fill(false) }),
      {},
    ),
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const nextStepTimeRef = useRef<number>(0);
  const timerIDRef = useRef<number | null>(null);
  const currentStepRef = useRef<number>(-1);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as Window &
            typeof globalThis & { webkitAudioContext?: typeof AudioContext }
        ).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);
        const crunchFactor = 4;
        let lastVal = 0;
        for (let i = 0; i < bufferSize; i++) {
          if (i % crunchFactor === 0) {
            lastVal = Math.random() * 2 - 1;
          }
          output[i] = lastVal;
        }
        noiseBufferRef.current = buffer;
      } else {
        console.error("Web Audio API is not supported in this browser.");
      }
    }
  }, []);

  const playSound = useCallback((drumId: string) => {
    const ctx = audioContextRef.current;
    const noiseBuffer = noiseBufferRef.current;
    if (!ctx || !noiseBuffer) return;

    const t = ctx.currentTime;

    if (drumId === "kick") {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(150, t);
      oscillator.frequency.exponentialRampToValueAtTime(10, t + 0.1);

      gainNode.gain.setValueAtTime(1, t);
      gainNode.gain.linearRampToValueAtTime(0.01, t + 0.15);
      oscillator.start(t);
      oscillator.stop(t + 0.15);
    } else if (drumId === "snare") {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "square";
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      oscGain.gain.setValueAtTime(0.5, t);
      oscGain.gain.linearRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseSource.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.6, t);
      noiseGain.gain.linearRampToValueAtTime(0.01, t + 0.15);
      noiseSource.start(t);
      noiseSource.stop(t + 0.15);
    } else if (drumId === "hihat") {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseSource.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.linearRampToValueAtTime(0.01, t + 0.04);
      noiseSource.start(t);
      noiseSource.stop(t + 0.04);
    } else if (drumId === "clap") {
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const env = ctx.createGain();
      noiseSource.connect(env);
      env.connect(ctx.destination);

      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.5, t + 0.005);
      env.gain.linearRampToValueAtTime(0.1, t + 0.01);
      env.gain.linearRampToValueAtTime(0.5, t + 0.02);
      env.gain.linearRampToValueAtTime(0.01, t + 0.1);

      noiseSource.start(t);
      noiseSource.stop(t + 0.1);
    }
  }, []);

  const toggleStep = useCallback((drumId: string, stepIndex: number) => {
    setGrid((prev) => ({
      ...prev,
      [drumId]: prev[drumId].map((val, i) => (i === stepIndex ? !val : val)),
    }));
  }, []);

  const scheduleNextTick = useCallback(
    function tick() {
      const ctx = audioContextRef.current;
      if (!ctx || !isPlaying) return;

      const currentTime = ctx.currentTime;
      const secondsPerBeat = 60.0 / bpm;
      const sixteenthNoteDuration = secondsPerBeat / 4;

      while (nextStepTimeRef.current < currentTime + 0.1) {
        const stepToPlay = (currentStepRef.current + 1) % STEPS;

        DRUMS.forEach((drum) => {
          if (grid[drum.id]?.[stepToPlay]) {
            playSound(drum.id);
          }
        });

        currentStepRef.current = stepToPlay;
        setCurrentStep(stepToPlay);
        nextStepTimeRef.current += sixteenthNoteDuration;
      }
      timerIDRef.current = requestAnimationFrame(tick);
    },
    [bpm, grid, isPlaying, playSound],
  );

  useEffect(() => {
    initAudio();

    if (isPlaying) {
      if (audioContextRef.current && nextStepTimeRef.current === 0) {
        nextStepTimeRef.current = audioContextRef.current.currentTime;
      }
      timerIDRef.current = requestAnimationFrame(scheduleNextTick);
    } else {
      if (timerIDRef.current) {
        cancelAnimationFrame(timerIDRef.current);
        timerIDRef.current = null;
      }
      currentStepRef.current = -1;
      setCurrentStep(-1);
      nextStepTimeRef.current = 0;
    }

    return () => {
      if (timerIDRef.current) {
        cancelAnimationFrame(timerIDRef.current);
      }
    };
  }, [isPlaying, scheduleNextTick, initAudio]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 md:p-8 bg-black rounded-lg border border-zinc-800 shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-6 border-b border-zinc-900 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
          <h2 className="text-xl font-medium tracking-tight text-white uppercase">
            Sequencer
          </h2>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-start gap-1">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Tempo: {bpm} BPM
            </label>
            <input
              type="range"
              min="60"
              max="200"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="w-32 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>

          <button
            onClick={() => {
              initAudio();
              setIsPlaying(!isPlaying);
            }}
            className={`px-6 py-2 rounded font-medium text-sm transition-colors uppercase tracking-widest ${
              isPlaying
                ? "bg-zinc-800 text-white hover:bg-zinc-700"
                : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            {isPlaying ? "Stop" : "Play"}
          </button>
        </div>
      </div>

      <div className="space-y-3 overflow-x-auto pb-4 custom-scrollbar">
        {DRUMS.map((drum) => (
          <div key={drum.id} className="flex items-center gap-4 min-w-[700px]">
            <div className="w-20 text-xs font-medium uppercase tracking-widest text-zinc-500 text-right">
              {drum.label}
            </div>
            <div className="flex gap-2 flex-1">
              {grid[drum.id].map((active, i) => (
                <button
                  key={i}
                  onClick={() => toggleStep(drum.id, i)}
                  className={`
                    h-10 flex-1 rounded-sm transition-all duration-100 ease-in-out border
                    ${
                      active
                        ? "bg-white border-white scale-95"
                        : "bg-transparent border-zinc-800 hover:border-zinc-600"
                    }
                    ${currentStep === i ? "ring-2 ring-zinc-500 ring-offset-2 ring-offset-black" : ""}
                    ${i % 4 === 0 && !active ? "border-zinc-700 bg-zinc-900/30" : ""}
                  `}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 min-w-[700px] mt-4 ml-24 hidden sm:flex">
        {Array(STEPS)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-opacity duration-75 ${
                currentStep === i
                  ? "bg-white opacity-100"
                  : "bg-zinc-800 opacity-30"
              }`}
            />
          ))}
      </div>
    </div>
  );
}
