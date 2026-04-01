/**
 * Integration tests for the login page.
 *
 * Verifies that the email/password login form and registration link
 * are only rendered in development mode, while SSO is always available
 * when configured. In production, only SSO login is shown.
 *
 * Dependencies:
 * - vitest, @testing-library/react
 * - app/(auth)/login/page.tsx (LoginPage server component)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

/* Stub child client components so the server component renders without side effects. */
vi.mock('@/components/auth/login-form', () => ({
  LoginForm: (props: { redirectTo: string }) => (
    <div data-testid="login-form" data-redirect-to={props.redirectTo} />
  ),
}));

vi.mock('@/components/auth/sso-button', () => ({
  SsoButton: (props: { redirectTo: string }) => (
    <div data-testid="sso-button" data-redirect-to={props.redirectTo} />
  ),
}));

vi.mock('@/components/auth/login-page-card', () => ({
  LoginPageCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="login-page-card">{children}</div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * Helper to render the async LoginPage server component.
 *
 * @param options.nodeEnv - Value for process.env.NODE_ENV during render.
 * @param options.azureAdClientId - Value for process.env.AZURE_AD_CLIENT_ID.
 * @param options.error - Optional error query parameter.
 */
async function renderLoginPage(options: {
  nodeEnv: string;
  azureAdClientId?: string;
  error?: string;
}) {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAzureId = process.env.AZURE_AD_CLIENT_ID;

  process.env.NODE_ENV = options.nodeEnv;
  process.env.AZURE_AD_CLIENT_ID = options.azureAdClientId ?? '';

  /* Dynamic import so module-level reads of process.env pick up our overrides. */
  vi.resetModules();
  const { default: LoginPage } = await import('@/app/(auth)/login/page');

  const searchParams = Promise.resolve({
    redirectTo: '/dashboard',
    error: options.error,
  });

  const jsx = await LoginPage({ searchParams });
  const result = render(jsx);

  /* Restore env after render so the component has already read the values. */
  process.env.NODE_ENV = originalNodeEnv;
  process.env.AZURE_AD_CLIENT_ID = originalAzureId;

  return result;
}

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('production mode (SSO only)', () => {
    it('renders the SSO button when Azure AD is configured', async () => {
      await renderLoginPage({ nodeEnv: 'production', azureAdClientId: 'test-client-id' });

      expect(screen.getByTestId('sso-button')).toBeInTheDocument();
    });

    it('does not render the email/password login form', async () => {
      await renderLoginPage({ nodeEnv: 'production', azureAdClientId: 'test-client-id' });

      expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
    });

    it('does not render the registration link', async () => {
      await renderLoginPage({ nodeEnv: 'production', azureAdClientId: 'test-client-id' });

      expect(screen.queryByText(/create one/i)).not.toBeInTheDocument();
    });

    it('does not render the "or" divider', async () => {
      await renderLoginPage({ nodeEnv: 'production', azureAdClientId: 'test-client-id' });

      expect(screen.queryByText('or')).not.toBeInTheDocument();
    });
  });

  describe('development mode (SSO + email/password)', () => {
    it('renders both SSO button and login form when Azure AD is configured', async () => {
      await renderLoginPage({ nodeEnv: 'development', azureAdClientId: 'test-client-id' });

      expect(screen.getByTestId('sso-button')).toBeInTheDocument();
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
    });

    it('renders the "or" divider between SSO and login form', async () => {
      await renderLoginPage({ nodeEnv: 'development', azureAdClientId: 'test-client-id' });

      expect(screen.getByText('or')).toBeInTheDocument();
    });

    it('renders the registration link', async () => {
      await renderLoginPage({ nodeEnv: 'development', azureAdClientId: 'test-client-id' });

      expect(screen.getByText(/create one/i)).toBeInTheDocument();
    });

    it('renders only the login form when Azure AD is not configured', async () => {
      await renderLoginPage({ nodeEnv: 'development', azureAdClientId: '' });

      expect(screen.queryByTestId('sso-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('login-form')).toBeInTheDocument();
    });
  });
});
