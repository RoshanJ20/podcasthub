import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  }),
}));

describe('MobileTopBar', () => {
  it('uses tokenized brand styling for logo marks (no hardcoded orange)', () => {
    const { container } = render(
      <MobileTopBar userName="Jane Doe" userRole="Member" isAdmin={false} />
    );
    const header = container.querySelector('[data-testid="mobile-top-bar"]');
    expect(header?.querySelector('.bg-primary')).not.toBeNull();
    expect(header?.querySelector('.bg-orange-500')).toBeNull();
  });
});
