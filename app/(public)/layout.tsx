/**
 * Layout for all public-facing pages in Podcast Hub.
 *
 * Renders the unified sidebar on desktop, mobile top bar + bottom player
 * on mobile, and page content in the main area with page transitions.
 */
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { MobileBottomPlayer } from '@/components/layout/mobile-bottom-player';
import { PageTransition } from '@/components/layout/page-transition';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // TODO(auth): Replace with session data from getUserSession()
  const userName = 'User';
  const userRole = 'Member';

  return (
    <div className="flex min-h-screen">
      <UnifiedSidebar userName={userName} userRole={userRole} />
      <div className="flex flex-1 flex-col">
        <MobileTopBar userName={userName} userRole={userRole} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
        <MobileBottomPlayer />
      </div>
    </div>
  );
}
