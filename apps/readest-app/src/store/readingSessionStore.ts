import { create } from 'zustand';

/**
 * Live reading-session seconds per book, published by ReadingStatsTracker.
 * The statistics tracker owns the clock; this store only mirrors its current
 * value for the footer timer.
 */
interface ReadingSessionState {
  sessionSeconds: { [key: string]: number };
}

export const useReadingSessionStore = create<ReadingSessionState>(() => ({
  sessionSeconds: {},
}));

export const setReadingSessionSeconds = (key: string, seconds: number) => {
  useReadingSessionStore.setState((state) => {
    if (state.sessionSeconds[key] === seconds) return state;
    return {
      sessionSeconds: {
        ...state.sessionSeconds,
        [key]: seconds,
      },
    };
  });
};

export const clearReadingSession = (key: string) => {
  useReadingSessionStore.setState((state) => {
    if (!(key in state.sessionSeconds)) return state;
    const next = { ...state.sessionSeconds };
    delete next[key];
    return { sessionSeconds: next };
  });
};

export const getReadingSessionSeconds = (key: string | null): number => {
  if (!key) return 0;
  return useReadingSessionStore.getState().sessionSeconds[key] ?? 0;
};

export const useReadingSessionSeconds = (key: string | null): number => {
  return useReadingSessionStore((s) => (key ? (s.sessionSeconds[key] ?? 0) : 0));
};
