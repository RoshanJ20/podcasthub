import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { RegisterForm } from '@/components/auth/register-form';
import { signIn } from 'next-auth/react';

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

describe('RegisterForm', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders shadcn input/button primitives for consistent UI styling', () => {
    render(<RegisterForm redirectTo="/" />);

    const displayNameInput = screen.getByLabelText('Display Name');
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Create account' });

    expect(displayNameInput.getAttribute('data-slot')).toBe('input');
    expect(emailInput.getAttribute('data-slot')).toBe('input');
    expect(passwordInput.getAttribute('data-slot')).toBe('input');
    expect(submitButton.getAttribute('data-slot')).toBe('button');
  });

  it('shows API error message when registration fails', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Email already exists' }),
    } as Response);

    vi.mocked(signIn).mockResolvedValue({ error: null } as never);

    render(<RegisterForm redirectTo="/" />);

    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Email already exists');
    });
  });
});
