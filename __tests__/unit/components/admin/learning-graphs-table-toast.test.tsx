/**
 * Unit tests for toast notifications in LearningGraphsTable.
 *
 * Verifies that delete operations show success/error toasts via sonner.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
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

    /* Open the delete confirmation dialog by clicking the trash icon */
    const deleteButtons = screen.getAllByRole('button');
    const trashButton = deleteButtons.find(
      (btn) => btn.querySelector('.text-destructive') !== null
    );
    expect(trashButton).toBeDefined();
    fireEvent.click(trashButton!);

    /* Confirm deletion — find the destructive "Delete" button in the dialog */
    const confirmButton = await screen.findByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Learning series deleted');
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows error toast when delete fails with non-ok response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<LearningGraphsTable graphs={mockGraphs} />);

    const deleteButtons = screen.getAllByRole('button');
    const trashButton = deleteButtons.find(
      (btn) => btn.querySelector('.text-destructive') !== null
    );
    fireEvent.click(trashButton!);

    const confirmButton = await screen.findByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete learning series');
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows error toast when delete throws a network error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<LearningGraphsTable graphs={mockGraphs} />);

    const deleteButtons = screen.getAllByRole('button');
    const trashButton = deleteButtons.find(
      (btn) => btn.querySelector('.text-destructive') !== null
    );
    fireEvent.click(trashButton!);

    const confirmButton = await screen.findByRole('button', { name: /^delete$/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete learning series');
    });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
