/**
 * Admin layout providing the unified sidebar and main content area.
 *
 * Uses the same UnifiedSidebar as public pages but with isAdmin
 * flag to show admin navigation section.
 */
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logger';
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { PageTransition } from '@/components/layout/page-transition';

const log = createLogger('admin-layout');

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Read actual authenticated user's data from request headers
  const headersList = await headers();
  const userId = headersList.get('x-user-id') || '';
  const userEmail = headersList.get('x-user-email') || 'Admin';
  const userRole = headersList.get('x-user-role') || 'admin';
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
      // Fall back to email if fetch fails
      log.warn(
        { error: err instanceof Error ? err.message : String(err), userId },
        'Failed to fetch user context for admin layout'
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
      </div>
    </div>
  );
}
