import React, { createContext, useContext } from 'react';

/**
 * Context for application logging
 * Eliminates prop drilling of logInfo, logError, logWarning, logSuccess
 */
const LogContext = createContext(null);

export function LogProvider({ children, logInfo, logSuccess, logError, logWarning }) {
  const value = {
    logInfo: logInfo || (() => {}),
    logSuccess: logSuccess || (() => {}),
    logError: logError || (() => {}),
    logWarning: logWarning || (() => {}),
  };

  return (
    <LogContext.Provider value={value}>
      {children}
    </LogContext.Provider>
  );
}

/**
 * Hook to access logging functions
 * @returns {{ logInfo: Function, logSuccess: Function, logError: Function, logWarning: Function }}
 */
export function useLog() {
  const context = useContext(LogContext);
  if (!context) {
    // Return no-op functions if used outside provider (graceful degradation)
    return {
      logInfo: () => {},
      logSuccess: () => {},
      logError: () => {},
      logWarning: () => {},
    };
  }
  return context;
}

export default LogContext;
