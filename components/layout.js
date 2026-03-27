import { useGame } from '../contexts/game_context';
import Navbar from './navbar';
import GameEngine from './game_engine';
import TouchControls from './touch_controls';

export default function Layout({ children }) {
  const year                           = new Date().getFullYear();
  const { gameRef, touchEnabled }      = useGame();
  return (
    <div id="layoutContainer">
      <div id="layoutContentWrapper">
        <Navbar />
        <main className="container">
          <div style={{ position: 'relative' }}>
            <GameEngine ref={gameRef} />
            {touchEnabled && <TouchControls />}
          </div>
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
