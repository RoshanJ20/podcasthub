'use client';

/**
 * React Context for sharing a single global audio element ref across the app.
 *
 * Ensures that only one audio element is created and persists across page navigations.
 * All useHlsPlayer hooks reference the same audio element.
 */

import { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';

interface AudioContextType {
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  return <AudioContext.Provider value={{ audioRef }}>{children}</AudioContext.Provider>;
}

export function useAudioRef() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioRef must be used within AudioProvider');
  }
  return context.audioRef;
}
