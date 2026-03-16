import { UsersTable } from '@/components/admin/users-table';

export default function AdminUsersPage() {
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
