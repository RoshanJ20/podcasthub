/**
 * Layout for all public-facing pages in Podcast Hub.
 *
 * Renders the PublicNav at the top, page content in the main area,
 * and the MiniPlayer fixed at the bottom for persistent audio playback.
 */
import { PublicNav } from '@/components/layout/public-nav';
import { MiniPlayer } from '@/components/audio-player/mini-player';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <MiniPlayer />
    </div>
  );
}
