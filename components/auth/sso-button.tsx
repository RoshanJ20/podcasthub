/**
 * Microsoft Entra ID SSO sign-in button.
 *
 * Key responsibilities:
 * - Renders a branded "Sign in with Microsoft" button
 * - Navigates to /api/auth/sso/authorize with the redirectTo parameter
 * - Uses the existing Button component with outline variant for consistency
 *
 * Dependencies:
 * - @/components/ui/button (Button)
 *
 * @example
 * <SsoButton redirectTo="/dashboard" />
 */
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

/**
 * Props for the SsoButton component.
 */
interface SsoButtonProps {
  /** Post-login redirect path (e.g., "/", "/admin"). */
  redirectTo: string;
}

/**
 * Official Microsoft logo SVG (simplified, 14x14).
 *
 * Uses the four-quadrant Microsoft brand icon in official colors.
 */
function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

/**
 * Renders a "Sign in with Microsoft" button that initiates the SSO flow.
 *
 * When clicked, navigates to the SSO authorize endpoint which redirects
 * the user to the Microsoft Entra ID login page.
 *
 * @param props - Component props including the post-login redirect path.
 * @returns A styled button element that links to the SSO authorize endpoint.
 */
export function SsoButton({ redirectTo }: SsoButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    signIn('azure-ad', { callbackUrl: redirectTo });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-3"
      onClick={handleClick}
      disabled={isLoading}
    >
      <MicrosoftLogo />
      {isLoading ? 'Redirecting...' : 'Sign in with Microsoft'}
    </Button>
  );
}
