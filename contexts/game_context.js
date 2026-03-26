import { createContext, useContext, useRef } from 'react';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const gameRef = useRef(null);
  return <GameContext.Provider value={gameRef}>{children}</GameContext.Provider>;
}

export function useGame() { return useContext(GameContext); }
