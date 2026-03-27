import { useGame } from '../contexts/game_context';
import Navbar from './navbar';
import GameEngine from './game_engine';
import TouchControls from './touch_controls';
import VerticalControls from './vertical_controls';

export default function Layout({ children }) {
  const year                                                     = new Date().getFullYear();
  const { gameRef, touchEnabled, verticalControlsEnabled }       = useGame();
  return (
    <div id="layoutContainer">
      <div id="layoutContentWrapper">
        <Navbar />
        <main className="container">
          <div style={{ position: 'relative' }}>
            <GameEngine ref={gameRef} />
            {touchEnabled && <TouchControls />}
          </div>
          <div class="d-block d-lg-none w-100 text-center text-secondary">
            Hint: You can change control settings in the &equiv; menu.
          </div>
          {verticalControlsEnabled && <VerticalControls />}
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
