/**
 * Unit tests for toast notifications in LearningGraphsTable.
 *
 * Delete now uses the shared ConfirmByTypingDialog, so the confirm button
 * only enables after the user types the exact title. Each test types the
 * title, clicks Delete permanently, and asserts the correct toast fires.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { LearningGraphsTable } from '@/components/admin/learning-graphs-table';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockGraphs = [
  {
    id: 'graph-1',
    title: 'Test Path',
    domain: 'Audit',
    pathType: 'linear',
    createdAt: new Date('2026-01-01'),
    _count: { episodes: 3 },
  },
];

async function openDialogAndConfirm(title: string): Promise<void> {
  const trashButton = screen
    .getAllByRole('button')
    .find((btn) => btn.querySelector('.text-destructive') !== null);
  expect(trashButton).toBeDefined();
  fireEvent.click(trashButton!);

  const input = await screen.findByLabelText(/type/i);
  await userEvent.type(input, title);

  const confirmButton = await screen.findByRole('button', { name: /delete permanently/i });
  fireEvent.click(confirmButton);
}

describe('LearningGraphsTable toast notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows success toast when delete succeeds', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    });

    render(<LearningGraphsTable graphs={mockGraphs} />);
    await openDialogAndConfirm('Test Path');

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Learning series deleted');
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows error toast when delete fails with non-ok response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Failed to delete learning series' }),
    });

    render(<LearningGraphsTable graphs={mockGraphs} />);
    await openDialogAndConfirm('Test Path');

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete learning series');
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows error toast when delete throws a network error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<LearningGraphsTable graphs={mockGraphs} />);
    await openDialogAndConfirm('Test Path');

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
