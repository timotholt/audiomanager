import { createContext, useContext } from 'solid-js';

/**
 * Consolidated application context
 * Combines logging, playback, status, and credits into a single provider
 * to reduce provider nesting and simplify the component tree
 */
const AppContext = createContext(null);

export function AppProvider(props) {
    const value = {
        // Logging
        logInfo: props.logInfo || (() => { }),
        logSuccess: props.logSuccess || (() => { }),
        logError: props.logError || (() => { }),
        logWarning: props.logWarning || (() => { }),
        // Playback
        playingTakeId: props.playingTakeId,
        onPlayRequest: props.onPlayRequest || (() => { }),
        onStopRequest: props.onStopRequest || (() => { }),
        playedTakes: props.playedTakes || {},
        onTakePlayed: props.onTakePlayed || (() => { }),
        // Status
        onStatusChange: props.onStatusChange || (() => { }),
        // Credits
        onCreditsRefresh: props.onCreditsRefresh || (() => { }),
    };

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
}

/**
 * Hook to access logging functions
 */
export function useLog() {
    const context = useContext(AppContext);
    if (!context) {
        return {
            logInfo: () => { },
            logSuccess: () => { },
            logError: () => { },
            logWarning: () => { },
        };
    }
    return {
        logInfo: context.logInfo,
        logSuccess: context.logSuccess,
        logError: context.logError,
        logWarning: context.logWarning,
    };
}

/**
 * Hook to access playback state and controls
 */
export function usePlayback() {
    const context = useContext(AppContext);
    if (!context) {
        return {
            playingTakeId: null,
            onPlayRequest: () => { },
            onStopRequest: () => { },
            playedTakes: {},
            onTakePlayed: () => { },
        };
    }
    return {
        playingTakeId: context.playingTakeId,
        onPlayRequest: context.onPlayRequest,
        onStopRequest: context.onStopRequest,
        playedTakes: context.playedTakes,
        onTakePlayed: context.onTakePlayed,
    };
}

/**
 * Hook to access status change function
 */
export function useStatus() {
    const context = useContext(AppContext);
    if (!context) {
        return {
            onStatusChange: () => { },
        };
    }
    return {
        onStatusChange: context.onStatusChange,
    };
}

/**
 * Hook to access credits refresh function
 */
export function useCredits() {
    const context = useContext(AppContext);
    if (!context) {
        return {
            onCreditsRefresh: () => { },
        };
    }
    return {
        onCreditsRefresh: context.onCreditsRefresh,
    };
}

/**
 * Hook to access all app context values at once
 */
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        return {
            logInfo: () => { },
            logSuccess: () => { },
            logError: () => { },
            logWarning: () => { },
            playingTakeId: null,
            onPlayRequest: () => { },
            onStopRequest: () => { },
            playedTakes: {},
            onTakePlayed: () => { },
            onStatusChange: () => { },
            onCreditsRefresh: () => { },
        };
    }
    return context;
}

export default AppContext;
