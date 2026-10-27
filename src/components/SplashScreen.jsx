import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Fallback Web Audio API synthesizer for cinematic intro chord & sub-bass
 * in case the audio file fails to load or decode.
 */
function playSynthesizedIntro() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Sub-bass cinematic boom
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, now);
    subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.5);
    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 1.2);

    // Resonant cinematic chord (D power chord)
    const chordFrequencies = [73.42, 110.0, 146.83, 220.0, 293.66, 369.99];
    chordFrequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx < 2 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.2);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450 + idx * 180, now + 0.2);
      filter.frequency.exponentialRampToValueAtTime(80, now + 2.2);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.setValueAtTime(0.2 / (idx + 1), now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.2);
      osc.stop(now + 2.2);
    });
  } catch (err) {
    console.warn('Synthesized audio playback notice:', err);
  }
}

export default function SplashScreen({ onFinish }) {
  const [isExiting, setIsExiting] = useState(false);
  const timeoutRef = useRef(null);

  const handleEnter = useCallback(() => {
    if (isExiting) return;

    // 1. Putar efek suara intro dari /sounds/intro.mp3 dengan fallback synthesizer
    try {
      const audio = new Audio('/sounds/intro.mp3');
      audio.volume = 0.8;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio element play error, falling back to Web Audio API:', err);
          playSynthesizedIntro();
        });
      }
    } catch (err) {
      console.warn('Audio constructor error, falling back to Web Audio API:', err);
      playSynthesizedIntro();
    }

    // 2. Simpan status ke sessionStorage agar tidak muncul berulang saat navigasi atau refresh di sesi ini
    try {
      sessionStorage.setItem('cineva_intro_seen', 'true');
    } catch (e) {
      console.warn('sessionStorage is not available:', e);
    }

    // 3. Efek fade-out & transisi scale
    setIsExiting(true);

    // 4. Tutup splash screen setelah durasi transisi selesai (1000ms)
    timeoutRef.current = setTimeout(() => {
      if (typeof onFinish === 'function') {
        onFinish();
      }
    }, 1000);
  }, [isExiting, onFinish]);

  // Keyboard shortcut: tekan Enter atau Space untuk masuk
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleEnter]);

  return (
    <div
      id="cineva-splash-screen"
      role="dialog"
      aria-modal="true"
      aria-label="Cineva Splash Screen"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070709] select-none text-white overflow-hidden transition-all duration-1000 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Cinematic Gradient & Ambient Red Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/25 via-[#070709]/90 to-[#050507] pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] md:w-[700px] md:h-[700px] bg-red-600/12 rounded-full blur-[140px] pointer-events-none animate-pulse" />

      {/* Cinematic Film Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-xl mx-auto">
        {/* Animated Brand Title */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-[0.25em] md:tracking-[0.3em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-500 to-red-600 drop-shadow-[0_0_40px_rgba(220,38,38,0.65)] select-none">
          Cineva
        </h1>

        {/* Slogan */}
        <p className="mt-4 text-xs sm:text-sm md:text-base text-zinc-400 font-medium tracking-[0.3em] uppercase opacity-90">
          DISCOVER MOVIES & TV SERIES
        </p>

        {/* Enter Cineva CTA Button */}
        <button
          id="btn-enter-cineva"
          type="button"
          onClick={handleEnter}
          disabled={isExiting}
          className="group relative mt-10 inline-flex items-center gap-3.5 px-8 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white font-semibold text-sm sm:text-base tracking-wider uppercase rounded-full shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-70 disabled:cursor-default"
        >
          {/* Button Play Icon */}
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 group-hover:bg-white group-hover:text-red-600 transition-colors duration-200">
            <svg
              className="w-3.5 h-3.5 fill-current ml-0.5"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>

          <span className="font-bold tracking-widest">
            {isExiting ? 'Entering...' : 'Enter Cineva'}
          </span>
        </button>

        {/* Sound Experience Note */}
        <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
          <svg
            className="w-4 h-4 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
          <span className="tracking-wide">Sound experience recommended</span>
        </div>
      </div>
    </div>
  );
}