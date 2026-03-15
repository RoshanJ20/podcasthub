/**
 * Admin layout providing the sidebar navigation and main content area.
 *
 * Renders the AdminSidebar on the left with the page content on the right
 * in a flex layout. Applies to all routes under the (admin) route group.
 */
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
