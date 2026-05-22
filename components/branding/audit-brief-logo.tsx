/**
 * Brand mark and wordmark components for The Audit Brief.
 *
 * Key responsibilities:
 * - Provide a single source of truth for the rendered brand identity
 * - Adapt the "Audit Brief" wordmark to light and dark themes via
 *   `currentColor` so any caller can tint the text with Tailwind utilities
 *   such as `text-foreground` while the blue brand mark (`#0019ff`) stays
 *   constant in both themes
 *
 * Dependencies: none — both exports are pure inline SVG and render as
 * React Server Components.
 *
 * Usage:
 *   import { AuditBriefLogo, AuditBriefMark } from '@/components/branding/audit-brief-logo';
 *
 *   <AuditBriefLogo className="h-7 w-auto text-foreground" />
 *   <AuditBriefMark className="size-7" />
 */
import type { SVGProps } from 'react';

/**
 * Common props for the brand SVG components.
 *
 * Both components accept any standard SVG attribute (e.g. `className`,
 * `style`, `role`, `aria-*`) plus an optional accessible label that
 * overrides the default "The Audit Brief" announcement.
 */
type BrandSvgProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'viewBox' | 'xmlns'>;

/**
 * Full Audit Brief logo lockup — the blue brand mark plus the "Audit Brief"
 * wordmark.
 *
 * Sized via Tailwind height utilities (`h-7`, `h-10`, `h-12`, …) — the SVG
 * preserves its 1002.23 × 414.68 aspect ratio so width is computed
 * automatically when `w-auto` is applied.
 *
 * The wordmark text uses `fill="currentColor"`, so set the desired text
 * colour on a parent (e.g. `text-foreground`) or on the SVG itself.
 *
 * @param props - Standard SVG props. `aria-label` defaults to
 *   `"The Audit Brief"`; pass an explicit override when the surrounding
 *   context already announces the brand.
 */
export function AuditBriefLogo({
  'aria-label': ariaLabel = 'The Audit Brief',
  ...rest
}: BrandSvgProps) {
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="130 128 755 162"
      {...rest}
    >
      <text
        fill="currentColor"
        fontFamily="Geist-SemiBold, Geist, ui-sans-serif, system-ui, sans-serif"
        fontSize="107.92"
        fontWeight={600}
        transform="translate(318.11 251.28)"
      >
        <tspan letterSpacing="-0.02em" x="0" y="0">
          A
        </tspan>
        <tspan letterSpacing="0em" x="74.14" y="0">
          u
        </tspan>
        <tspan letterSpacing="-0.02em" x="137.49" y="0">
          d
        </tspan>
        <tspan letterSpacing="-0.03em" x="202.78" y="0">
          i
        </tspan>
        <tspan letterSpacing="0em" x="228.25" y="0">
          t{' '}
        </tspan>
        <tspan letterSpacing="0em" x="299.8" y="0">
          B
        </tspan>
        <tspan letterSpacing="-0.03em" x="373.73" y="0">
          r
        </tspan>
        <tspan letterSpacing="0em" x="415.06" y="0">
          i
        </tspan>
        <tspan letterSpacing="-0.03em" x="443.01" y="0">
          e
        </tspan>
        <tspan letterSpacing="0em" x="503.56" y="0">
          f
        </tspan>
      </text>
      <AuditBriefMarkPaths />
    </svg>
  );
}

/**
 * Brand mark only — the rounded blue square with the two dot-pattern columns.
 *
 * Use this in places where the full wordmark cannot fit (e.g. the collapsed
 * sidebar header at 56 px wide). The viewBox is cropped to the mark's
 * bounding box so the component renders as a perfect square.
 *
 * @param props - Standard SVG props. `aria-label` defaults to
 *   `"The Audit Brief"`.
 */
export function AuditBriefMark({
  'aria-label': ariaLabel = 'The Audit Brief',
  ...rest
}: BrandSvgProps) {
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="141.92 138.23 138.23 138.23"
      {...rest}
    >
      <AuditBriefMarkPaths />
    </svg>
  );
}

/**
 * Internal shared SVG fragment for the rounded blue square + dot grids.
 *
 * Kept private so both public components stay byte-identical for the mark
 * and there is exactly one place to edit if the artwork changes.
 */
function AuditBriefMarkPaths() {
  return (
    <g>
      <rect fill="#0019ff" x="141.92" y="138.23" width="138.23" height="138.23" rx="15" ry="15" />
      <g fill="#fff">
        <circle cx="245.4" cy="196.07" r="3.99" />
        <circle cx="233.78" cy="184.3" r="3.99" />
        <circle cx="222.26" cy="172.78" r="3.99" />
        <circle cx="222.26" cy="184.3" r="3.99" />
        <circle cx="222.26" cy="196.07" r="3.99" />
        <circle cx="222.26" cy="207.34" r="3.99" />
        <circle cx="222.26" cy="218.86" r="3.99" />
        <circle cx="233.78" cy="196.07" r="3.99" />
        <circle cx="233.78" cy="207.34" r="3.99" />
        <circle cx="245.3" cy="207.34" r="3.99" />
        <circle cx="233.78" cy="218.86" r="3.99" />
        <circle cx="222.26" cy="230.38" r="3.99" />
        <circle cx="256.82" cy="207.34" r="3.99" />
        <circle cx="245.4" cy="218.86" r="3.99" />
        <circle cx="233.78" cy="230.38" r="3.99" />
        <circle cx="222.26" cy="241.9" r="3.99" />
        <circle cx="199.33" cy="196.07" r="3.99" />
        <circle cx="187.71" cy="184.3" r="3.99" />
        <circle cx="176.19" cy="172.78" r="3.99" />
        <circle cx="176.19" cy="184.3" r="3.99" />
        <circle cx="176.19" cy="196.07" r="3.99" />
        <circle cx="176.19" cy="207.34" r="3.99" />
        <circle cx="176.19" cy="218.86" r="3.99" />
        <circle cx="187.71" cy="196.07" r="3.99" />
        <circle cx="187.71" cy="207.34" r="3.99" />
        <circle cx="199.23" cy="207.34" r="3.99" />
        <circle cx="187.71" cy="218.86" r="3.99" />
        <circle cx="176.19" cy="230.38" r="3.99" />
        <circle cx="210.74" cy="207.34" r="3.99" />
        <circle cx="199.33" cy="218.86" r="3.99" />
        <circle cx="187.71" cy="230.38" r="3.99" />
        <circle cx="176.19" cy="241.9" r="3.99" />
      </g>
    </g>
  );
}
