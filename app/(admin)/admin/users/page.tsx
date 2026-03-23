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
 * - Requires superadmin role (enforced by an in-component header check in
 *   addition to the admin layout middleware)
 * - User data is fetched client-side by UsersTable to support pagination and
 *   filtering
 */
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { UsersTable } from '@/components/admin/users-table';

/**
 * Renders the admin user-management page.
 *
 * Reads the `x-user-role` request header set by middleware and redirects to
 * `/unauthorized` if the caller is not a superadmin.
 *
 * @returns A server-rendered page containing the users table, or a redirect
 * response when the caller lacks sufficient privileges.
 */
export default async function AdminUsersPage() {
  const headersList = await headers();
  const userRole = headersList.get('x-user-role');
  const currentUserId = headersList.get('x-user-id') || '';

  // Only superadmins can access user management
  if (userRole !== 'superadmin') {
    redirect('/unauthorized');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage user accounts and roles.</p>
      </div>
      <UsersTable currentUserId={currentUserId} />
    </div>
  );
}
