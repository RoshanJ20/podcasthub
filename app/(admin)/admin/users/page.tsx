import { UsersTable } from '@/components/admin/users-table';

export default function AdminUsersPage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <UsersTable />
    </div>
  );
}
