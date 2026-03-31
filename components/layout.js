import { useEffect, useRef, useState } from 'react';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import { useGame } from '../contexts/game_context';
import Navbar from './navbar';
import GameEngine from './game_engine';
import TouchControls from './touch_controls';
import VerticalControls from './vertical_controls';

// Debounce delay before showing the resize toast (ms).
// Avoids firing during smooth resize drags.
const RESIZE_DEBOUNCE_MS = 500;

export default function Layout({ children }) {
  const year                                               = new Date().getFullYear();
  const { gameRef, touchEnabled, verticalControlsEnabled } = useGame();
  const [showResizeToast, setShowResizeToast]              = useState(false);
  const [version, setVersion]                              = useState(null);
  const resizeTimerRef                                     = useRef(null);

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(({ version }) => setVersion(version))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleResize = () => {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => {
        setShowResizeToast(true);
      }, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimerRef.current);
    };
  }, []);

  const handleRestartFromToast = () => {
    setShowResizeToast(false);
    gameRef.current?.restart();
  };

  return (
    <div id="layoutContainer">
      <div id="layoutContentWrapper">
        <Navbar />
        <main className="container">
          <div style={{ position: 'relative' }}>
            <GameEngine ref={gameRef} />
            {touchEnabled && <TouchControls />}
          </div>
          <div className="d-block d-lg-none w-100 text-center text-secondary">
            Hint: You can change control settings in the &equiv; menu.
          </div>
          {verticalControlsEnabled && <VerticalControls />}
          {children}
        </main>
      </div>
      <footer id="layoutFooter" className="text-center text-muted">
        <hr />
        <p>&copy; {year} Shaumik Ashraf | Version {version}</p>
      </footer>

      <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1100 }}>
        <Toast show={showResizeToast} onClose={() => setShowResizeToast(false)} bg="dark">
          <Toast.Header>
            <strong className="me-auto">Browser resized</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            The game canvas has changed size.{' '}
            <button
              className="btn btn-link btn-sm p-0 text-warning"
              onClick={handleRestartFromToast}
            >
              Restart the game
            </button>
            {' '}to apply the new dimensions.
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
