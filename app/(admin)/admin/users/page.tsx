/**
 * Admin Users Page
 *
 * @module app/(admin)/admin/users/page
 *
 * @description Server component that displays all registered users and provides
 * role management capabilities. Restricted to superadmin users; any admin
 * without the superadmin role is redirected to the unauthorized page.
 *
 * @remarks
 * - Requires superadmin role (enforced by an in-component session check in
 *   addition to the admin layout middleware)
 * - User data is fetched client-side by UsersTable to support pagination and
 *   filtering
 */
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/next-auth-options';
import { UsersTable } from '@/components/admin/users-table';

/**
 * Renders the admin user-management page.
 *
 * Reads the session via getServerSession and redirects to `/unauthorized`
 * if the caller is not a superadmin.
 *
 * @returns A server-rendered page containing the users table, or a redirect
 * response when the caller lacks sufficient privileges.
 */
export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;
  const currentUserId = session?.user?.id ?? '';

  if (userRole !== 'superadmin') {
    redirect('/unauthorized');
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-default dark:border-border-subtle bg-elevated/85 p-5 shadow-card">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Admin Console</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">User Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage user accounts and roles.</p>
      </section>
      <UsersTable currentUserId={currentUserId} />
    </div>
  );
}
