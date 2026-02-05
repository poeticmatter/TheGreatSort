import React, { createContext, useContext, useReducer, ReactNode, Dispatch, useMemo } from 'react';
import { GameState, GameAction } from '../reducers/gameState';
import { gameReducer, initialState } from '../reducers/gameReducer';

// Define the Context Type
interface GameContextType {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

// Create Context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Provider Component
export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

// Custom Hook to consume the context
export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};
