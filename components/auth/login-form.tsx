/**
 * Login form client component for The Audit Brief.
 *
 * Key responsibilities:
 * - Renders email and password inputs with validation
 * - Submits credentials to POST /api/auth/login
 * - Displays error messages on authentication failure
 * - Redirects to the specified URL on successful login
 *
 * Dependencies:
 * - React (useState, useCallback)
 *
 * @example
 * <LoginForm redirectTo="/dashboard" />
 */
'use client';

import { useState, useCallback } from 'react';
import { signIn } from 'next-auth/react';

/**
 * Props for the LoginForm component.
 */
interface LoginFormProps {
  /** URL to redirect to after successful login. Defaults to '/'. */
  redirectTo: string;
}

/**
 * Client-side login form with email/password authentication.
 *
 * Submits credentials to the /api/auth/login endpoint via fetch.
 * On success, redirects to the specified redirectTo URL.
 * On failure, displays the error message from the API response.
 *
 * @param props - Component props including the redirectTo URL.
 * @returns The login form JSX.
 */
export function LoginForm({ redirectTo }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles form submission by posting credentials to the login API.
   *
   * On success, performs a client-side redirect to the redirectTo URL.
   * On failure, sets the error state with the API error message.
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError('Invalid email or password');
          return;
        }

        // Redirect on successful login
        window.location.href = redirectTo;
      } catch {
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, redirectTo]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="you@example.com"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter your password"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
