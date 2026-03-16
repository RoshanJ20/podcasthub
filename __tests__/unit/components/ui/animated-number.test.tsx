/**
 * Unit tests for the AnimatedNumber component.
 *
 * These tests cover:
 * - The target value is rendered immediately in reduced-motion mode.
 * - A custom formatter is applied to the displayed value.
 * - The component renders a span element.
 * - An optional className is forwarded to the span.
 *
 * The `matchMedia` stub activates reduced-motion so tests can assert the
 * final formatted value without waiting for spring animations to settle.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnimatedNumber } from '@/components/ui/animated-number';

/** Stub matchMedia with `matches: true` to force reduced-motion mode. */
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

describe('AnimatedNumber', () => {
  it('should render the target value in reduced-motion mode', () => {
    render(<AnimatedNumber value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should apply a custom formatter', () => {
    render(<AnimatedNumber value={1234} formatter={(n) => n.toLocaleString()} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('should render a span element', () => {
    const { container } = render(<AnimatedNumber value={10} />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('should forward an optional className to the span', () => {
    const { container } = render(<AnimatedNumber value={7} className="text-2xl font-bold" />);
    const span = container.querySelector('span') as HTMLSpanElement;
    expect(span.className).toContain('text-2xl');
    expect(span.className).toContain('font-bold');
  });

  it('should default to rounding when no formatter is provided', () => {
    render(<AnimatedNumber value={3.7} />);
    // Default formatter rounds to nearest integer.
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('should render zero when value is 0', () => {
    render(<AnimatedNumber value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
