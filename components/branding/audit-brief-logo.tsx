/**
 * Brand mark and wordmark components for The Audit Brief.
 *
 * Both components render the canonical brand asset from `public/`, kept as
 * a single SVG file so the design lives in one place (no per-letter tspan
 * markup reimplemented in JSX). The full logo file is colour-aware via a
 * `prefers-color-scheme: dark` rule embedded in the SVG itself.
 *
 * Usage:
 *   import { AuditBriefLogo, AuditBriefMark } from '@/components/branding/audit-brief-logo';
 *
 *   <AuditBriefLogo className="h-7 w-auto" />
 *   <AuditBriefMark className="size-7" />
 */
import { withBasePath } from '@/lib/config/base-path';

type BrandImgProps = {
  className?: string;
  'aria-label'?: string;
};

/**
 * Full Audit Brief logo lockup — blue brand mark plus the "Audit Brief"
 * wordmark. Loaded as an `<img>` so the SVG asset in `public/` is the single
 * source of truth.
 *
 * The SVG preserves its 1002.23 × 414.68 aspect ratio, so callers should set
 * a height (e.g. `h-8`) and use `w-auto`.
 */
export function AuditBriefLogo({
  className,
  'aria-label': ariaLabel = 'The Audit Brief',
}: BrandImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG asset; next/image adds no optimization value
    <img src={withBasePath('/audit-brief-logo.svg')} alt={ariaLabel} className={className} />
  );
}

/**
 * Brand mark only — the rounded blue square with the two dot-pattern columns.
 *
 * Use in places where the wordmark cannot fit (e.g. the collapsed sidebar
 * header). The asset is a square (138.23 × 138.23) so `size-*` works directly.
 */
export function AuditBriefMark({
  className,
  'aria-label': ariaLabel = 'The Audit Brief',
}: BrandImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG asset; next/image adds no optimization value
    <img src={withBasePath('/audit-brief-mark.svg')} alt={ariaLabel} className={className} />
  );
}
