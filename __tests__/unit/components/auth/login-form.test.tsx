import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { LoginForm } from '@/components/auth/login-form';
import { signIn } from 'next-auth/react';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders shadcn input/button primitives for consistent UI styling', () => {
    render(<LoginForm redirectTo="/" />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign in' });

    expect(emailInput.getAttribute('data-slot')).toBe('input');
    expect(passwordInput.getAttribute('data-slot')).toBe('input');
    expect(submitButton.getAttribute('data-slot')).toBe('button');
  });

  it('shows an error message when credentials are invalid', async () => {
    vi.mocked(signIn).mockResolvedValue({ error: 'CredentialsSignin' } as never);

    render(<LoginForm redirectTo="/" />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Invalid email or password');
    });
  });
});
