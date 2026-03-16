/**
 * User profile page — server component shell.
 *
 * Renders the client-side profile form for display name editing,
 * theme toggling, and viewing listening stats.
 */
import { ProfileForm } from '@/components/profile/profile-form';

export const metadata = {
  title: 'Profile | Podcast Hub',
  description: 'Manage your profile and preferences',
};

export default function ProfilePage() {
  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>
      <ProfileForm />
    </div>
  );
}
