/**
 * Admin layout providing the unified sidebar and main content area.
 *
 * Uses the same UnifiedSidebar as public pages but with isAdmin
 * flag to show admin navigation section.
 */
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { PageTransition } from '@/components/layout/page-transition';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // TODO(auth): Replace with session data from getUserSession()
  const userName = 'Admin';
  const userRole = 'Admin';

  return (
    <div className="flex min-h-screen">
      <UnifiedSidebar userName={userName} userRole={userRole} isAdmin />
      <div className="flex flex-1 flex-col">
        <MobileTopBar userName={userName} userRole={userRole} isAdmin />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
