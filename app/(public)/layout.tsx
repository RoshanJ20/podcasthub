/**
 * Layout for all public-facing pages in Podcast Hub.
 *
 * Renders the PublicNav at the top, page content in the main area,
 * and a placeholder element at the bottom for a future mini audio player.
 */
import { PublicNav } from '@/components/layout/public-nav';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      {/* Placeholder for future mini audio player */}
      <div id="mini-player-slot" />
    </div>
  );
}
