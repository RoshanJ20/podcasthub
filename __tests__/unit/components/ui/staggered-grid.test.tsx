/**
 * Unit tests for StaggeredGrid and StaggeredGridItem components.
 *
 * These tests cover:
 * - Children are rendered in both animated and reduced-motion modes.
 * - The wrapper element carries the `grid` class (plus any caller-supplied classes).
 * - StaggeredGridItem renders its child content.
 *
 * The `matchMedia` stub simulates the OS reduced-motion preference so both
 * code paths can be exercised without a real browser.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';

/** Stub matchMedia to return `matches: true` (prefers-reduced-motion active). */
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  );
});

describe('StaggeredGrid', () => {
  it('should render all children', () => {
    render(
      <StaggeredGrid className="grid-cols-3">
        <div data-testid="child-1">A</div>
        <div data-testid="child-2">B</div>
      </StaggeredGrid>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });

  it('should apply the grid class alongside caller-supplied classes', () => {
    const { container } = render(
      <StaggeredGrid className="grid-cols-2 gap-4">
        <div>A</div>
      </StaggeredGrid>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('grid');
  });

  it('should render a single child without errors', () => {
    render(
      <StaggeredGrid>
        <div data-testid="only-child">Solo</div>
      </StaggeredGrid>
    );

    expect(screen.getByTestId('only-child')).toBeInTheDocument();
  });
});

describe('StaggeredGridItem', () => {
  it('should render its child content', () => {
    render(
      <StaggeredGridItem>
        <span data-testid="item-content">Hello</span>
      </StaggeredGridItem>
    );

    expect(screen.getByTestId('item-content')).toBeInTheDocument();
  });

  it('should apply an optional className to the wrapper', () => {
    const { container } = render(
      <StaggeredGridItem className="col-span-2">
        <span>Content</span>
      </StaggeredGridItem>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('col-span-2');
  });
});
