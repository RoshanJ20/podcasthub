/**
 * @file favorite-button.tsx
 * @description Accessible heart-shaped toggle button for favoriting audit briefs.
 *
 * Key responsibilities:
 * - Renders a heart icon that fills red when active and is outlined when inactive
 * - Plays a burst mini-hearts animation when toggling to favorited
 * - Prevents click events from bubbling to parent card/link elements
 * - Provides accessible aria-label that reflects the current favorite state
 *
 * Usage:
 * ```tsx
 * <FavoriteButton
 *   isFavorite={isFavorite(brief.id)}
 *   onToggle={() => toggleFavorite(brief.id)}
 * />
 * ```
 */

'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Positions for the burst mini-hearts — spread around the main heart. */
const BURST_HEARTS = [
  { x: -10, y: -12, delay: 0, scale: 0.45 },
  { x: 9, y: -13, delay: 25, scale: 0.4 },
  { x: -12, y: 3, delay: 50, scale: 0.35 },
  { x: 11, y: 4, delay: 35, scale: 0.45 },
  { x: -6, y: -16, delay: 15, scale: 0.3 },
] as const;

/** Props for the FavoriteButton component. */
interface FavoriteButtonProps {
  /** Whether the item is currently favorited by the user. Controls icon fill and aria-label. */
  isFavorite: boolean;
  /** Callback invoked when the button is pressed. Should toggle the favorite state. */
  onToggle: () => void;
  /** Optional Tailwind class names to apply to the outer button element. */
  className?: string;
}

/**
 * A round heart-shaped toggle button for adding or removing favorites.
 *
 * Stops click propagation so it can be safely embedded inside clickable cards
 * or anchor elements without triggering navigation. Plays a burst animation
 * with mini-hearts when favoriting.
 *
 * @param props.isFavorite - Whether the current item is favorited
 * @param props.onToggle   - Handler called when the button is activated
 * @param props.className  - Additional class names for the button wrapper
 */
export function FavoriteButton({ isFavorite, onToggle, className }: FavoriteButtonProps) {
  const [showSplash, setShowSplash] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isFavorite) {
      setShowSplash(true);
      setTimeout(() => setShowSplash(false), 500);
    }
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        'group/fav relative flex items-center justify-center rounded-full p-1.5 transition-[color,background-color,transform] duration-150 hover:bg-muted active:scale-90 active:duration-[100ms]',
        className
      )}
    >
      <Heart
        className={cn(
          'size-4 transition-[color,fill,transform] duration-200',
          isFavorite
            ? 'fill-red-500 text-red-500'
            : 'fill-transparent text-muted-foreground group-hover/fav:text-red-400',
          showSplash && 'fill-red-500 text-red-500 scale-125'
        )}
        style={
          showSplash ? { transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' } : undefined
        }
      />

      {/* Expanding ring */}
      {showSplash && (
        <span
          className="absolute size-6 rounded-full border-[1.5px] border-red-400/60"
          style={{ animation: 'fav-card-ring 400ms cubic-bezier(0.23, 1, 0.32, 1) forwards' }}
        />
      )}

      {/* Burst mini-hearts */}
      {showSplash &&
        BURST_HEARTS.map((h, i) => (
          <Heart
            key={i}
            className="absolute size-2 fill-red-400 text-red-400"
            style={
              {
                animation: `fav-card-burst 400ms cubic-bezier(0.23, 1, 0.32, 1) ${h.delay}ms forwards`,
                '--burst-x': `${h.x}px`,
                '--burst-y': `${h.y}px`,
                '--burst-scale': h.scale,
              } as React.CSSProperties
            }
          />
        ))}

      <style>{`
        @keyframes fav-card-ring {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fav-card-burst {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          60% { opacity: 1; }
          100% { transform: translate(var(--burst-x), var(--burst-y)) scale(var(--burst-scale)); opacity: 0; }
        }
      `}</style>
    </button>
  );
}
