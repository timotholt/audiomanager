import { createSignal, onMount, onCleanup } from 'solid-js';

const DEBUG_CONSOLE_CAPTURE = false;

/**
 * Hook for capturing browser console output
 * Intercepts console.log, console.warn, console.error, console.info
 * and stores them for display in the Console view
 */
export function useConsoleCapture() {
  const [entries, setEntries] = createSignal([]);
  let originalConsole = {};
  let isInitialized = false;

  onMount(() => {
    // Only initialize once
    if (isInitialized) return;
    isInitialized = true;

    // Store original console methods
    originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };

    const createInterceptor = (level) => (...args) => {
      // Always call original console method
      originalConsole[level](...args);

      // Format the message
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }).join(' ');

      // Create entry
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        level,
        message,
        // Store raw args for potential expansion
        args: args.length > 1 || (args.length === 1 && typeof args[0] === 'object') ? args : null,
      };

      if (DEBUG_CONSOLE_CAPTURE) {
        originalConsole.log('[ConsoleCapture] Captured:', level, message.substring(0, 50));
      }

      setEntries(prev => {
        // Keep max 500 entries
        const newEntries = [entry, ...prev];
        if (newEntries.length > 500) {
          return newEntries.slice(0, 500);
        }
        return newEntries;
      });
    };

    // Override console methods
    console.log = createInterceptor('log');
    console.warn = createInterceptor('warn');
    console.error = createInterceptor('error');
    console.info = createInterceptor('info');
    console.debug = createInterceptor('debug');

    if (DEBUG_CONSOLE_CAPTURE) {
      originalConsole.log('[ConsoleCapture] Initialized');
    }

    // Cleanup on unmount
    onCleanup(() => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    });
  });

  const clearEntries = () => {
    setEntries([]);
  };

  return {
    entries, // Signal accessor
    clearEntries,
  };
}
