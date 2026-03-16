'use client';

/**
 * Profile form component.
 *
 * Provides:
 * - Display name editing (React Hook Form)
 * - Theme toggle (next-themes)
 * - Listening stats summary (total listens, total bookmarks)
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ProfileFormValues {
  displayName: string;
}

interface ListeningStats {
  totalListens: number;
  totalBookmarks: number;
}

export function ProfileForm() {
  const { theme, setTheme } = useTheme();
  const [stats, setStats] = useState<ListeningStats>({ totalListens: 0, totalBookmarks: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    defaultValues: { displayName: '' },
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [bookmarkRes] = await Promise.all([fetch('/api/bookmarks?limit=1')]);
        const bookmarkData = await bookmarkRes.json();
        setStats({
          totalListens: 0, // Will be populated when activity endpoint supports counts
          totalBookmarks: bookmarkData.pagination?.total ?? 0,
        });
      } catch (error) {
        console.warn('Failed to fetch profile stats:', error);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const onSubmit = async (data: ProfileFormValues) => {
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: data.displayName }),
      });
      if (res.ok) {
        setSaveMessage('Profile updated successfully');
      } else {
        setSaveMessage('Failed to update profile');
      }
    } catch {
      setSaveMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Display Name */}
      <Card>
        <CardHeader>
          <CardTitle>Display Name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Name</Label>
              <Input
                id="displayName"
                {...register('displayName', { required: 'Display name is required' })}
                placeholder="Enter your display name"
              />
              {errors.displayName && (
                <p className="text-sm text-destructive">{errors.displayName.message}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {saveMessage && <p className="text-sm text-muted-foreground">{saveMessage}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Theme Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
              >
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
              >
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
              >
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Listening Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Listening Stats</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <p className="text-sm text-muted-foreground">Loading stats...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{stats.totalListens}</p>
                <p className="text-sm text-muted-foreground">Total Listens</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{stats.totalBookmarks}</p>
                <p className="text-sm text-muted-foreground">Total Bookmarks</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
