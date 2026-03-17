import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { UsersTable } from '@/components/admin/users-table';

export default async function AdminUsersPage() {
  const headersList = await headers();
  const userRole = headersList.get('x-user-role');

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
      <UsersTable />
    </div>
  );
}
