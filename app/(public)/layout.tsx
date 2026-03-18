/**
 * Layout for all public-facing pages in Podcast Hub.
 *
 * Renders the unified sidebar on desktop, mobile top bar + bottom player
 * on mobile, and page content in the main area with page transitions.
 */
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { MobileBottomPlayer } from '@/components/layout/mobile-bottom-player';
import { PageTransition } from '@/components/layout/page-transition';

const log = createLogger('public-layout');

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Read authenticated user's data from request headers
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const userEmail = headersList.get('x-user-email') || 'User';
  const userRole = headersList.get('x-user-role') || 'member';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  // Fetch user's display name from database
  let userName = 'User';
  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      });
      if (user?.displayName) {
        userName = user.displayName;
      }
    } catch (err) {
      // Fall back to email if fetch fails
      log.warn(
        { error: err instanceof Error ? err.message : String(err), userId },
        'Failed to fetch user context for public layout'
      );
      userName = userEmail.split('@')[0];
    }
  }

  return (
    <div className="flex min-h-screen">
      <UnifiedSidebar userName={userName} userRole={userRole} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col">
        <MobileTopBar userName={userName} userRole={userRole} isAdmin={isAdmin} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
        <MobileBottomPlayer />
      </div>
    </div>
  );
}
