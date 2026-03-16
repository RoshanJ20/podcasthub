/**
 * AnimatedTabs — accessible tab component with a Motion sliding indicator and
 * directional content transitions.
 *
 * Key responsibilities:
 * - Render a tab bar whose active indicator slides between tabs via `layoutId`.
 * - Animate tab content in/out with a directional slide (left ↔ right) based on
 *   the relative position of the newly selected tab.
 * - Support both controlled and uncontrolled usage.
 * - Skip all animations when the user prefers reduced motion.
 *
 * Dependencies:
 * - motion/react — motion, AnimatePresence.
 * - lib/animation — shared transition tokens.
 * - hooks/use-reduced-motion — OS-level motion preference.
 * - lib/utils — cn() class merger.
 *
 * Usage:
 *   const tabs = [
 *     { value: 'overview', label: 'Overview', content: <OverviewPanel /> },
 *     { value: 'analytics', label: 'Analytics', content: <AnalyticsPanel /> },
 *   ];
 *   <AnimatedTabs tabs={tabs} defaultValue="overview" />
 */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { transitions } from '@/lib/animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** Describes a single tab entry. */
interface TabItem {
  /** Unique identifier used as the internal key. */
  value: string;
  /** Human-readable label rendered in the tab bar. */
  label: string;
  /** Content rendered in the panel area when this tab is active. */
  content: React.ReactNode;
}

interface AnimatedTabsProps {
  /** Ordered list of tab definitions. */
  tabs: TabItem[];
  /** Initially selected tab value (uncontrolled mode). */
  defaultValue?: string;
  /** Currently selected tab value (controlled mode). */
  value?: string;
  /** Callback fired when the user selects a different tab. */
  onValueChange?: (value: string) => void;
  /** Additional classes applied to the root wrapper. */
  className?: string;
  /**
   * Unique identifier for the sliding Motion indicator.
   * Must be unique per page if multiple `AnimatedTabs` instances coexist.
   * Defaults to `'tab-indicator'`.
   */
  layoutId?: string;
}

/**
 * Tab component with an animated sliding underline indicator and directional
 * content crossfade transitions.
 *
 * Supports both controlled (`value` + `onValueChange`) and uncontrolled
 * (`defaultValue`) usage patterns.
 *
 * @param tabs - Array of tab items with value, label, and content.
 * @param defaultValue - Initially selected tab (uncontrolled).
 * @param value - Externally controlled active tab.
 * @param onValueChange - Called when the user changes the active tab.
 * @param className - Extra classes for the root wrapper div.
 * @param layoutId - Shared Motion layoutId for the indicator element.
 * @returns An animated tab bar with associated content panel.
 */
export function AnimatedTabs({
  tabs,
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  layoutId = 'tab-indicator',
}: AnimatedTabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue ?? tabs[0]?.value);
  // direction: 1 = moving right (new tab is to the right), -1 = moving left.
  const [direction, setDirection] = useState(0);
  const reducedMotion = useReducedMotion();

  const activeTab = controlledValue ?? internalTab;
  const activeIndex = tabs.findIndex((t) => t.value === activeTab);
  const activeContent = tabs.find((t) => t.value === activeTab)?.content;

  /**
   * Calculates the slide direction relative to the currently active tab and
   * updates internal state (or delegates to the controlled handler).
   *
   * @param value - The value of the newly selected tab.
   */
  const handleTabChange = (value: string) => {
    const newIndex = tabs.findIndex((t) => t.value === value);
    // Positive direction = tab is to the right of the current one.
    setDirection(newIndex > activeIndex ? 1 : -1);
    setInternalTab(value);
    onValueChange?.(value);
  };

  return (
    <div className={className}>
      {/* Tab bar */}
      <div className="relative flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}

            {/* Sliding underline indicator — shared layoutId enables the morph. */}
            {activeTab === tab.value && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                transition={transitions.normal}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content panel with directional crossfade. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={reducedMotion ? undefined : { opacity: 0, x: direction * 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, x: direction * -20 }}
          transition={transitions.fast}
          className="mt-4"
        >
          {activeContent}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
