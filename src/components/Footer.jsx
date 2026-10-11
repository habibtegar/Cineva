import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer bg-gray-900 text-gray-400 border-t border-zinc-800/80 mt-16 py-10 px-6">
      <div className="footer__container max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        {/* Brand & Copyright Info */}
        <div className="footer__info flex flex-col items-center md:items-start gap-1.5">
          <Link
            to="/"
            className="footer__brand text-xl font-bold text-white tracking-tight flex items-center gap-1"
          >
            <span>Cineva</span>
            <span className="footer__brand-dot text-red-500">.</span>
          </Link>
          <p className="footer__copyright text-sm text-gray-400">
            © {currentYear} Cineva. All rights reserved.
          </p>
          <p className="footer__credit text-xs text-gray-500">
            Movie data & images provided by{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
            >
              TMDB
            </a>
          </p>
        </div>

        {/* Social / External Links */}
        <div className="footer__socials flex items-center gap-4">
          <a
            href="https://github.com/habibtegar/Cineva"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="footer__social-link text-gray-400 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition-colors"
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
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TMDB"
            className="footer__social-link text-gray-400 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition-colors"
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
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
