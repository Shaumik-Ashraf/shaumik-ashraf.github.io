import { createContext, useContext, useEffect, useRef, useState } from 'react';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const gameRef = useRef(null);
  const [touchEnabled,           setTouchEnabledState]    = useState(false);
  const [verticalControlsEnabled, setVerticalEnabledState] = useState(false);

  // SSR guard: read persisted settings only on client and auto-detect defaults.
  // Setting state inside an effect is intentional here — localStorage is unavailable
  // during SSR and using it in useState initializers causes hydration mismatches.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Bootstrap's --bs-breakpoint-lg aligns our detection with Bootstrap's grid system
    const lgPx   = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--bs-breakpoint-lg') || '992',
      10
    );
    const small   = window.innerWidth < lgPx;
    const portrait = window.innerWidth < window.innerHeight;

    const savedTouch = localStorage.getItem('touchEnabled');
    setTouchEnabledState(
      savedTouch !== null ? savedTouch === 'true' : small && !portrait
    );

    const savedVert = localStorage.getItem('verticalControlsEnabled');
    setVerticalEnabledState(
      savedVert !== null ? savedVert === 'true' : small && portrait
    );
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setTouchEnabled = (value) => {
    const next = typeof value === 'function' ? value(touchEnabled) : value;
    setTouchEnabledState(next);
    localStorage.setItem('touchEnabled', next);
  };

  const setVerticalControlsEnabled = (value) => {
    const next = typeof value === 'function' ? value(verticalControlsEnabled) : value;
    setVerticalEnabledState(next);
    localStorage.setItem('verticalControlsEnabled', next);
  };

  const ctx = { gameRef, touchEnabled, setTouchEnabled, verticalControlsEnabled, setVerticalControlsEnabled };
  return <GameContext.Provider value={ctx}>{children}</GameContext.Provider>;
}

export function useGame() { return useContext(GameContext); }
