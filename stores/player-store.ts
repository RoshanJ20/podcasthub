/**
 * Zustand store for global audio player state management.
 *
 * Manages the currently playing auditBrief, playback controls (play/pause, seek,
 * volume, playback rate), audio type toggling (short/long versions), and
 * mini player visibility. All state transitions are clamped to valid ranges.
 */
import { create } from 'zustand';

/** Allowed playback rate multipliers for speed control. */
const ALLOWED_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Number of seconds to skip forward/backward. */
const SKIP_SECONDS = 10;

/** Minimal audit brief info needed by the player. */
export interface AuditBriefInfo {
  id: string;
  title: string;
  audioShortUrl: string;
  audioLongUrl?: string | null;
  thumbnailUrl?: string | null;
}

/** Player state shape. */
interface PlayerState {
  currentAuditBrief: AuditBriefInfo | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  audioType: 'short' | 'long';
  isMiniPlayerVisible: boolean;
}

/** Player action methods. */
interface PlayerActions {
  loadAuditBrief: (auditBrief: AuditBriefInfo) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setAudioType: (type: 'short' | 'long') => void;
  toggleAudioType: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  setCurrentTime: (time: number) => void;
  closeMiniPlayer: () => void;
}

const initialState: PlayerState = {
  currentAuditBrief: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  audioType: 'short',
  isMiniPlayerVisible: false,
};

export const usePlayerStore = create<PlayerState & PlayerActions>()((set, get) => ({
  ...initialState,

  loadAuditBrief: (auditBrief) =>
    set({
      currentAuditBrief: auditBrief,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      audioType: 'short',
      isMiniPlayerVisible: true,
    }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  seek: (time) => {
    const { duration } = get();
    set({ currentTime: Math.max(0, Math.min(time, duration)) });
  },

  setDuration: (duration) => set({ duration }),

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

  setPlaybackRate: (rate) => {
    if (ALLOWED_PLAYBACK_RATES.includes(rate)) set({ playbackRate: rate });
  },

  setAudioType: (type) => set({ audioType: type, currentTime: 0 }),

  toggleAudioType: () =>
    set((state) => ({
      audioType: state.audioType === 'short' ? 'long' : 'short',
      currentTime: 0,
    })),

  skipForward: () => {
    const { currentTime, duration } = get();
    set({ currentTime: Math.min(currentTime + SKIP_SECONDS, duration) });
  },

  skipBackward: () => {
    const { currentTime } = get();
    set({ currentTime: Math.max(currentTime - SKIP_SECONDS, 0) });
  },

  setCurrentTime: (time) => set({ currentTime: time }),

  closeMiniPlayer: () =>
    set({ isMiniPlayerVisible: false, isPlaying: false, currentAuditBrief: null }),
}));
