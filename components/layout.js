import { useGame } from '../contexts/game_context';
import Navbar from './navbar';
import GameEngine from './game_engine';

export default function Layout({ children }) {
  const year    = new Date().getFullYear();
  const gameRef = useGame();
  return (
    <div id="layoutContainer">
      <div id="layoutContentWrapper">
        <Navbar />
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
