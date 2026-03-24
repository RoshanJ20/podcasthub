/**
 * Users management table for the admin dashboard.
 *
 * Key responsibilities:
 * - Displays paginated list of registered users
 * - Supports search filtering by name or email
 * - Allows admin role changes with confirmation dialog
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { withBasePath } from '@/lib/config/base-path';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

const ROLES = ['public', 'admin', 'superadmin'];

interface UsersTableProps {
  /** ID of the currently authenticated user, used to disable self-role-change. */
  currentUserId: string;
}

/**
 * Renders a paginated, searchable table of users with role management.
 *
 * @returns Users management table with search, pagination, and role change controls
 */
export function UsersTable({ currentUserId }: UsersTableProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    role: string;
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await fetch(withBasePath(`/api/users?${params}`));
      const data = await res.json();
      setUsers(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setPendingRoleChange({ userId, role: newRole });
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setError(null);
    try {
      const res = await fetch(withBasePath(`/api/users/${pendingRoleChange.userId}/role`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: pendingRoleChange.role }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === pendingRoleChange.userId ? { ...user, role: pendingRoleChange.role } : user
          )
        );
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? 'Failed to update role');
      }
    } finally {
      setPendingRoleChange(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="max-w-sm"
        />
        <Button
          type="submit"
          variant="outline"
          className="border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
        >
          Search
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading users...</div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {total} user{total !== 1 ? 's' : ''} total
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Email
                  </TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Display Name
                  </TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Role
                  </TableHead>
                  <TableHead className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Joined
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    className="border-border/30 transition-colors hover:bg-secondary/30"
                  >
                    <TableCell className="py-3.5">{user.email}</TableCell>
                    <TableCell className="py-3.5">{user.name ?? '-'}</TableCell>
                    <TableCell className="py-3.5">
                      {user.id === currentUserId ? (
                        <span className="text-sm text-muted-foreground">{user.role} (you)</span>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(value) => {
                            if (value) handleRoleChange(user.id, value);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
            >
              Next
            </Button>
          </div>
        </>
      )}

      {/* Role change confirmation dialog */}
      {pendingRoleChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Role Change</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to change this user&apos;s role to{' '}
              <strong>{pendingRoleChange.role}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingRoleChange(null)}>
                Cancel
              </Button>
              <Button onClick={confirmRoleChange}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
