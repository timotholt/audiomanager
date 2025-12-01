import React, { createContext, useContext } from 'react';

/**
 * Context for audio playback state and controls
 * Eliminates prop drilling of playback-related props
 */
const PlaybackContext = createContext(null);

export function PlaybackProvider({ 
  children, 
  playingTakeId,
  onPlayRequest,
  onStopRequest,
  playedTakes,
  onTakePlayed
}) {
  const value = {
    playingTakeId,
    onPlayRequest: onPlayRequest || (() => {}),
    onStopRequest: onStopRequest || (() => {}),
    playedTakes: playedTakes || {},
    onTakePlayed: onTakePlayed || (() => {}),
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

/**
 * Hook to access playback state and controls
 */
export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    // Return defaults if used outside provider
    return {
      playingTakeId: null,
      onPlayRequest: () => {},
      onStopRequest: () => {},
      playedTakes: {},
      onTakePlayed: () => {},
    };
  }
  return context;
}

export default PlaybackContext;
