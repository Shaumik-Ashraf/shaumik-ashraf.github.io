import { useRef } from 'react';
import Navbar from './navbar';
import GameEngine from './game_engine';

export default function Layout({ children }) {
  const year    = new Date().getFullYear();
  const gameRef = useRef(null);
  return (
    <div id="layoutContainer">
      <div id="layoutContentWrapper">
        <Navbar gameRef={gameRef} />
        <main className="container">
          <GameEngine ref={gameRef} />
          {children}
        </main>
      </div>
      <footer id="layoutFooter" className="text-center text-muted">
        <hr />
        <p>&copy; {year} Shaumik Ashraf</p>
      </footer>
    </div>
  );
}
