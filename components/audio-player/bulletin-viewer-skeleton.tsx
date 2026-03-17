/**
 * BulletinViewerSkeleton — loading placeholder for the BulletinViewer PDF panel.
 *
 * Key responsibilities:
 * - Renders an animated skeleton UI that matches the BulletinViewer chrome
 *   (toolbar + document body) while the viewer chunk and PDF are loading.
 * - Used exclusively as the `loading` prop of the dynamic BulletinViewer import
 *   in podcast-detail-layout.tsx to prevent layout shift during lazy load.
 *
 * Dependencies:
 * - Tailwind CSS utility classes only (no external runtime dependency).
 *
 * Usage example:
 *   const BulletinViewer = dynamic(() => import('./bulletin-viewer'), {
 *     loading: () => <BulletinViewerSkeleton />,
 *   });
 */

/**
 * Animated skeleton placeholder shown while BulletinViewer loads.
 *
 * @returns A full-height flex column with pulsing toolbar and document blocks.
 */
export function BulletinViewerSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2.5">
        <div className="h-5 w-36 animate-pulse rounded-md bg-muted-foreground/15" />
        <div className="flex gap-2">
          <div className="h-7 w-7 animate-pulse rounded-md bg-muted-foreground/10" />
          <div className="h-7 w-7 animate-pulse rounded-md bg-muted-foreground/10" />
        </div>
      </div>
      {/* Document skeleton */}
      <div className="mx-auto max-w-lg flex-1 animate-pulse space-y-5 p-10">
        <div className="space-y-3">
          <div className="h-7 w-3/4 rounded-md bg-muted-foreground/15" />
          <div className="h-5 w-1/2 rounded-md bg-muted-foreground/10" />
        </div>
        <div className="space-y-2.5">
          <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-5/6 rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-4/6 rounded bg-muted-foreground/10" />
        </div>
        <div className="h-44 w-full rounded-xl bg-muted-foreground/8" />
        <div className="space-y-2.5">
          <div className="h-3.5 w-full rounded bg-muted-foreground/10" />
          <div className="h-3.5 w-3/4 rounded bg-muted-foreground/10" />
        </div>
      </div>
    </div>
  );
}
