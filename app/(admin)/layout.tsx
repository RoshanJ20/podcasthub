/**
 * Admin layout providing the unified sidebar and main content area.
 *
 * Uses the same UnifiedSidebar as public pages but with isAdmin
 * flag to show admin navigation section.
 */
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/next-auth-options';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { PageTransition } from '@/components/layout/page-transition';

const log = createLogger('admin-layout');

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  const userId = session?.user?.id ?? '';
  const userEmail = session?.user?.email ?? 'Admin';
  const userRole = session?.user?.role ?? 'admin';
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  // Fetch user's display name from database
  let userName = 'Admin';
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
        'Failed to fetch user context for admin layout'
      );
      userName = userEmail.split('@')[0];
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <UnifiedSidebar userName={userName} userRole={userRole} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col">
        <MobileTopBar userName={userName} userRole={userRole} isAdmin={isAdmin} />
        <main className="flex-1 bg-[radial-gradient(circle_at_top_right,oklch(95%_0.02_264/.35),transparent_40%)] p-4 md:p-6 lg:p-8">
          <PageTransition className="mx-auto w-full max-w-[1200px]">{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
