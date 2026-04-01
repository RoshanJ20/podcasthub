/**
 * Layout for all public-facing pages in The Audit Brief.
 *
 * Renders the unified sidebar on desktop, mobile top bar + bottom player
 * on mobile, and page content in the main area with page transitions.
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/next-auth-options';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { MobileBottomPlayer } from '@/components/layout/mobile-bottom-player';
import { PageTransition } from '@/components/layout/page-transition';

const log = createLogger('public-layout');

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  const userId = session?.user?.id ?? '';
  const userEmail = session?.user?.email ?? 'User';
  const userRole = session?.user?.role ?? 'member';
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
      log.warn(
        { error: err instanceof Error ? err.message : String(err), userId },
        'Failed to fetch user context for public layout'
      );
      userName = userEmail.split('@')[0];
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <UnifiedSidebar userName={userName} userRole={userRole} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col">
        <MobileTopBar userName={userName} userRole={userRole} isAdmin={isAdmin} />
        <main className="flex-1 gradient-brand-light p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1200px]">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <MobileBottomPlayer />
      </div>
    </div>
  );
}
