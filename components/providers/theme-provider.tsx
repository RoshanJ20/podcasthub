/**
 * Theme provider wrapper for next-themes.
 *
 * Key responsibilities:
 * - Enables dark/light/system theme switching
 * - Must be a Client Component (uses React context)
 *
 * @example
 * <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
 *   {children}
 * </ThemeProvider>
 */
'use client';

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
