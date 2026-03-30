/**
 * Domain color palette for The Audit Brief.
 *
 * Maps each knowledge domain to a consistent set of color tokens used for
 * accent theming across cards, badges, and progress indicators.
 *
 * Key responsibilities:
 * - Define the DomainColor shape (light + dark mode variants)
 * - Export getDomainColor() for components to look up a domain's palette
 *
 * @dependencies lib/schemas/common for DOMAINS constant
 */

/** Color tokens for a single domain, covering light and dark mode. */
export interface DomainColor {
  /** Light mode badge background (rgba) */
  bg: string;
  /** Light mode badge text color */
  text: string;
  /** Dark mode badge background (rgba) */
  darkBg: string;
  /** Dark mode badge text color */
  darkText: string;
  /** Accent border / progress bar / indicator color */
  border: string;
  /** Dark mode glow shadow color (rgba with low opacity) */
  glow: string;
}

/** Palette definitions keyed by domain name. */
const DOMAIN_COLORS: Record<string, DomainColor> = {
  'Audit Methodology': {
    bg: 'rgba(59, 130, 246, 0.12)',
    text: '#1d4ed8',
    darkBg: 'rgba(59, 130, 246, 0.2)',
    darkText: '#93c5fd',
    border: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.15)',
  },
  'Accounting and Reporting': {
    bg: 'rgba(16, 185, 129, 0.12)',
    text: '#065f46',
    darkBg: 'rgba(16, 185, 129, 0.2)',
    darkText: '#6ee7b7',
    border: '#10b981',
    glow: 'rgba(16, 185, 129, 0.15)',
  },
  'Audit Technology': {
    bg: 'rgba(139, 92, 246, 0.12)',
    text: '#5b21b6',
    darkBg: 'rgba(139, 92, 246, 0.2)',
    darkText: '#c4b5fd',
    border: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.15)',
  },
  'Quality and Risk': {
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#92400e',
    darkBg: 'rgba(245, 158, 11, 0.2)',
    darkText: '#fcd34d',
    border: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
  LEAP: {
    bg: 'rgba(239, 68, 68, 0.12)',
    text: '#991b1b',
    darkBg: 'rgba(239, 68, 68, 0.2)',
    darkText: '#fca5a5',
    border: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.15)',
  },
  Auditing: {
    bg: 'rgba(20, 184, 166, 0.12)',
    text: '#0f766e',
    darkBg: 'rgba(20, 184, 166, 0.2)',
    darkText: '#5eead4',
    border: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.15)',
  },
};

/** Fallback palette for unknown domains. */
const FALLBACK_COLOR: DomainColor = {
  bg: 'rgba(107, 114, 128, 0.12)',
  text: '#374151',
  darkBg: 'rgba(107, 114, 128, 0.2)',
  darkText: '#d1d5db',
  border: '#6b7280',
  glow: 'rgba(107, 114, 128, 0.15)',
};

/**
 * Returns the DomainColor palette for the given domain name.
 *
 * Falls back to a neutral grey palette for unrecognised domains.
 *
 * @param domain - The domain string (e.g. "Audit Methodology", "LEAP").
 * @returns The DomainColor token set for that domain.
 */
export function getDomainColor(domain: string): DomainColor {
  return DOMAIN_COLORS[domain] ?? FALLBACK_COLOR;
}

/** Vertical CSS gradients for the card accent line, keyed by domain. */
const DOMAIN_GRADIENTS: Record<string, string> = {
  'Audit Methodology': 'linear-gradient(180deg, #3b82f6, #6366f1, #8b5cf6)',
  'Accounting and Reporting': 'linear-gradient(180deg, #10b981, #059669, #0d9488)',
  'Audit Technology': 'linear-gradient(180deg, #8b5cf6, #a855f7, #d946ef)',
  'Quality and Risk': 'linear-gradient(180deg, #f59e0b, #f97316, #ef4444)',
  LEAP: 'linear-gradient(180deg, #ef4444, #f43f5e, #ec4899)',
  Auditing: 'linear-gradient(180deg, #14b8a6, #06b6d4, #3b82f6)',
};

const FALLBACK_GRADIENT = 'linear-gradient(180deg, #6b7280, #9ca3af, #6b7280)';

/**
 * Returns a vertical CSS gradient string for the given domain.
 *
 * Used for the thick left accent line on audit brief cards.
 *
 * @param domain - The domain string.
 * @returns A CSS linear-gradient value.
 */
export function getDomainGradient(domain: string): string {
  return DOMAIN_GRADIENTS[domain] ?? FALLBACK_GRADIENT;
}
