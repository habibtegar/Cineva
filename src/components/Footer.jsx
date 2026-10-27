import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer bg-[#0f0f11] text-zinc-400 border-t border-zinc-800/80 mt-16 py-10 pb-20 sm:pb-10 px-6 sm:px-8 lg:px-12">
      <div className="footer__container max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-between gap-8 md:gap-10 text-center md:text-left">
        {/* 1. Kolom Kiri: Branding & Lisensi Legal TMDB */}
        <div className="footer__info flex flex-col items-center md:items-start gap-2 max-w-md">
          <Link
            to="/"
            className="footer__brand text-xl font-bold text-white tracking-tight flex items-center gap-1 hover:opacity-90 transition-opacity"
          >
            <span>Cineva</span>
            <span className="footer__brand-dot text-red-500">.</span>
          </Link>
          <p className="footer__copyright text-sm text-zinc-400">
            © {currentYear} Cineva. All rights reserved.
          </p>
          <p className="footer__disclaimer text-xs text-zinc-500 leading-relaxed mt-1">
            Movie data & images provided by{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-red-400 underline underline-offset-2 transition-colors font-medium"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <p className="footer__credit text-xs text-zinc-600 mt-0.5">
            Crafted with React, Tailwind & Vite.
          </p>
        </div>

        {/* 2. Kolom Tengah: Quick Links Navigasi */}
        <div className="footer__nav flex flex-col items-center md:items-start gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Quick Links
          </span>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm text-left">
            <Link
              to="/"
              className="text-sm text-zinc-400 hover:text-red-500 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/favorites"
              className="text-sm text-zinc-400 hover:text-red-500 transition-colors"
            >
              Favorites
            </Link>
            <Link
              to="/movies"
              className="text-sm text-zinc-400 hover:text-red-500 transition-colors"
            >
              Movies
            </Link>
            <Link
              to="/feedback"
              className="text-sm text-zinc-400 hover:text-red-500 transition-colors"
            >
              Feedback & Requests
            </Link>
            <Link
              to="/tv"
              className="text-sm text-zinc-400 hover:text-red-500 transition-colors"
            >
              TV Shows
            </Link>
          </nav>
        </div>

        {/* 3. Kolom Kanan: Socials & Spacing aman dari tombol floating Back to Top */}
        <div className="footer__socials-wrapper flex flex-col items-center md:items-end gap-2.5 md:pr-14 lg:pr-16">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Connect
          </span>
          <div className="footer__socials flex items-center gap-3">
            <a
              href="https://github.com/habibtegar/Cineva"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              title="GitHub Repository"
              className="footer__social-link text-zinc-400 hover:text-white p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
            >
              <svg
                className="footer__social-icon w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </a>
            <a
              href="https://github.com/habibtegar"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Portfolio"
              title="Creator Portfolio"
              className="footer__social-link text-zinc-400 hover:text-white p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
            >
              <svg
                className="footer__social-icon w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
