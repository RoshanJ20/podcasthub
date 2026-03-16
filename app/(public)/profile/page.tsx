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
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      <ProfileForm />
    </div>
  );
}
