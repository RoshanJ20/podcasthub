/**
 * Root layout for Podcast Hub v2.
 *
 * Key responsibilities:
 * - Loads Geist font family
 * - Wraps app with ThemeProvider (dark/light mode via next-themes)
 * - Provides Sonner toast notifications
 * - Sets global metadata
 */
import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { CommandPalette } from '@/components/layout/command-palette';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Podcast Hub',
  description: 'Internal audio podcast platform for audit professionals',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CommandPalette />
          {children}
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
