import { createContext, useContext, useEffect, useRef, useState } from 'react';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const gameRef = useRef(null);
  const [touchEnabled, setTouchEnabledState] = useState(false);

  // SSR guard: read persisted setting only on client.
  // Setting state inside an effect is intentional here — there is no way to access
  // localStorage in the useState initializer without causing a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    setTouchEnabledState(localStorage.getItem('touchEnabled') === 'true');
  }, []);

  const setTouchEnabled = (value) => {
    const next = typeof value === 'function' ? value(touchEnabled) : value;
    setTouchEnabledState(next);
    localStorage.setItem('touchEnabled', next);
  };

  const ctx = { gameRef, touchEnabled, setTouchEnabled };
  return <GameContext.Provider value={ctx}>{children}</GameContext.Provider>;
}

export function useGame() { return useContext(GameContext); }
