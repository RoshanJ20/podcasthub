/**
 * Unit tests for the Zustand player store.
 *
 * Covers all state transitions: initial state, loadAuditBrief, play/pause/toggle,
 * seek (with clamping), volume (with clamping), playback rate validation,
 * audio type toggling, skip forward/backward, and mini player lifecycle.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '@/stores/player-store';

/** Helper to reset the store to initial state between tests. */
function resetStore() {
  usePlayerStore.setState({
    currentAuditBrief: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    audioType: 'short',
    isMiniPlayerVisible: false,
  });
}

beforeEach(() => {
  resetStore();
});

const mockAuditBrief = {
  id: '1',
  title: 'Test Audit Brief',
  audioShortUrl: '/audio/short.mp3',
  audioLongUrl: '/audio/long.mp3',
};

describe('player-store', () => {
  describe('initial state', () => {
    it('starts with no audit brief loaded', () => {
      const state = usePlayerStore.getState();
      expect(state.currentAuditBrief).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.volume).toBe(1);
      expect(state.playbackRate).toBe(1);
      expect(state.audioType).toBe('short');
      expect(state.isMiniPlayerVisible).toBe(false);
    });
  });

  describe('loadAuditBrief', () => {
    it('sets the current audit brief and resets playback state', () => {
      usePlayerStore.getState().loadAuditBrief(mockAuditBrief);
      const state = usePlayerStore.getState();
      expect(state.currentAuditBrief).toEqual(mockAuditBrief);
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.audioType).toBe('short');
      expect(state.isMiniPlayerVisible).toBe(true);
    });

    it('replaces a previously loaded audit brief', () => {
      usePlayerStore.getState().loadAuditBrief(mockAuditBrief);
      const newAuditBrief = { id: '2', title: 'New', audioShortUrl: '/new.mp3' };
      usePlayerStore.getState().loadAuditBrief(newAuditBrief);
      expect(usePlayerStore.getState().currentAuditBrief).toEqual(newAuditBrief);
    });

    it('resets currentTime when loading a new audit brief after seeking', () => {
      usePlayerStore.getState().loadAuditBrief(mockAuditBrief);
      usePlayerStore.getState().setDuration(100);
      usePlayerStore.getState().seek(50);
      const newAuditBrief = { id: '2', title: 'New', audioShortUrl: '/new.mp3' };
      usePlayerStore.getState().loadAuditBrief(newAuditBrief);
      expect(usePlayerStore.getState().currentTime).toBe(0);
    });
  });

  describe('play / pause / togglePlay', () => {
    it('play sets isPlaying to true', () => {
      usePlayerStore.getState().play();
      expect(usePlayerStore.getState().isPlaying).toBe(true);
    });

    it('pause sets isPlaying to false', () => {
      usePlayerStore.getState().play();
      usePlayerStore.getState().pause();
      expect(usePlayerStore.getState().isPlaying).toBe(false);
    });

    it('togglePlay toggles from false to true', () => {
      usePlayerStore.getState().togglePlay();
      expect(usePlayerStore.getState().isPlaying).toBe(true);
    });

    it('togglePlay toggles from true to false', () => {
      usePlayerStore.getState().play();
      usePlayerStore.getState().togglePlay();
      expect(usePlayerStore.getState().isPlaying).toBe(false);
    });
  });

  describe('seek', () => {
    it('sets currentTime to the given value', () => {
      usePlayerStore.getState().setDuration(100);
      usePlayerStore.getState().seek(42.5);
      expect(usePlayerStore.getState().currentTime).toBe(42.5);
    });

    it('clamps to 0 if negative', () => {
      usePlayerStore.getState().seek(-10);
      expect(usePlayerStore.getState().currentTime).toBe(0);
    });

    it('clamps to duration if exceeds', () => {
      usePlayerStore.getState().setDuration(100);
      usePlayerStore.getState().seek(150);
      expect(usePlayerStore.getState().currentTime).toBe(100);
    });

    it('handles seek to exact duration boundary', () => {
      usePlayerStore.getState().setDuration(60);
      usePlayerStore.getState().seek(60);
      expect(usePlayerStore.getState().currentTime).toBe(60);
    });

    it('handles seek to 0', () => {
      usePlayerStore.getState().setDuration(100);
      usePlayerStore.getState().seek(50);
      usePlayerStore.getState().seek(0);
      expect(usePlayerStore.getState().currentTime).toBe(0);
    });
  });

  describe('setVolume', () => {
    it('sets volume between 0 and 1', () => {
      usePlayerStore.getState().setVolume(0.5);
      expect(usePlayerStore.getState().volume).toBe(0.5);
    });

    it('clamps to 0', () => {
      usePlayerStore.getState().setVolume(-0.5);
      expect(usePlayerStore.getState().volume).toBe(0);
    });

    it('clamps to 1', () => {
      usePlayerStore.getState().setVolume(1.5);
      expect(usePlayerStore.getState().volume).toBe(1);
    });

    it('sets volume to exact boundary 0', () => {
      usePlayerStore.getState().setVolume(0);
      expect(usePlayerStore.getState().volume).toBe(0);
    });

    it('sets volume to exact boundary 1', () => {
      usePlayerStore.getState().setVolume(0.3);
      usePlayerStore.getState().setVolume(1);
      expect(usePlayerStore.getState().volume).toBe(1);
    });
  });

  describe('setPlaybackRate', () => {
    it('sets rate to allowed value 1.5', () => {
      usePlayerStore.getState().setPlaybackRate(1.5);
      expect(usePlayerStore.getState().playbackRate).toBe(1.5);
    });

    it('sets rate to allowed value 0.5', () => {
      usePlayerStore.getState().setPlaybackRate(0.5);
      expect(usePlayerStore.getState().playbackRate).toBe(0.5);
    });

    it('sets rate to allowed value 2', () => {
      usePlayerStore.getState().setPlaybackRate(2);
      expect(usePlayerStore.getState().playbackRate).toBe(2);
    });

    it('rejects invalid rate 3', () => {
      usePlayerStore.getState().setPlaybackRate(3);
      expect(usePlayerStore.getState().playbackRate).toBe(1);
    });

    it('rejects invalid rate 0', () => {
      usePlayerStore.getState().setPlaybackRate(0);
      expect(usePlayerStore.getState().playbackRate).toBe(1);
    });
  });

  describe('setAudioType', () => {
    it('sets audio type to long', () => {
      usePlayerStore.getState().setAudioType('long');
      expect(usePlayerStore.getState().audioType).toBe('long');
    });

    it('sets audio type to short', () => {
      usePlayerStore.getState().setAudioType('long');
      usePlayerStore.getState().setAudioType('short');
      expect(usePlayerStore.getState().audioType).toBe('short');
    });

    it('resets currentTime to 0 on type change', () => {
      usePlayerStore.getState().setDuration(100);
      usePlayerStore.getState().seek(30);
      usePlayerStore.getState().setAudioType('long');
      expect(usePlayerStore.getState().currentTime).toBe(0);
    });
  });

  describe('toggleAudioType', () => {
    it('toggles from short to long', () => {
      usePlayerStore.getState().toggleAudioType();
      expect(usePlayerStore.getState().audioType).toBe('long');
    });

    it('toggles from long to short', () => {
      usePlayerStore.getState().toggleAudioType();
      usePlayerStore.getState().toggleAudioType();
      expect(usePlayerStore.getState().audioType).toBe('short');
    });

    it('resets currentTime to 0 on toggle', () => {
      usePlayerStore.getState().setDuration(100);
      usePlayerStore.getState().seek(30);
      usePlayerStore.getState().toggleAudioType();
      expect(usePlayerStore.getState().currentTime).toBe(0);
    });
  });

  describe('skipForward / skipBackward', () => {
    it('skips forward by 10 seconds', () => {
      usePlayerStore.getState().setDuration(100);
      usePlayerStore.getState().seek(20);
      usePlayerStore.getState().skipForward();
      expect(usePlayerStore.getState().currentTime).toBe(30);
    });

    it('skips backward by 10 seconds', () => {
      usePlayerStore.getState().setDuration(100);
      usePlayerStore.getState().seek(20);
      usePlayerStore.getState().skipBackward();
      expect(usePlayerStore.getState().currentTime).toBe(10);
    });

    it('clamps skipForward to duration', () => {
      usePlayerStore.getState().setDuration(25);
      usePlayerStore.getState().seek(20);
      usePlayerStore.getState().skipForward();
      expect(usePlayerStore.getState().currentTime).toBe(25);
    });

    it('clamps skipBackward to 0', () => {
      usePlayerStore.getState().seek(5);
      usePlayerStore.getState().skipBackward();
      expect(usePlayerStore.getState().currentTime).toBe(0);
    });
  });

  describe('setCurrentTime', () => {
    it('sets currentTime directly', () => {
      usePlayerStore.getState().setCurrentTime(42);
      expect(usePlayerStore.getState().currentTime).toBe(42);
    });
  });

  describe('closeMiniPlayer', () => {
    it('hides mini player, stops playback, and clears audit brief', () => {
      usePlayerStore.getState().loadAuditBrief(mockAuditBrief);
      usePlayerStore.getState().play();
      usePlayerStore.getState().closeMiniPlayer();
      const state = usePlayerStore.getState();
      expect(state.isMiniPlayerVisible).toBe(false);
      expect(state.isPlaying).toBe(false);
      expect(state.currentAuditBrief).toBeNull();
    });
  });

  describe('setDuration', () => {
    it('sets duration', () => {
      usePlayerStore.getState().setDuration(300);
      expect(usePlayerStore.getState().duration).toBe(300);
    });
  });
});
