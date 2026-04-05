import BeatSequencer from "./components/BeatSequencer";

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      <main className="w-full max-w-5xl">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2">
            BEAT-BOX: The digital beat sequencer
          </h1>
          <p className="text-zinc-500 font-medium">
            Click the grid to program beats. Adjust BPM for speed.
          </p>
        </div>

        <BeatSequencer />

        <footer className="mt-12 text-center text-zinc-600 text-sm">
          Built with Next.js & Web Audio API
        </footer>
      </main>
    </div>
  );
}
