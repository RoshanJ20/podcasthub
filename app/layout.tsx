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
import { Geist, Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { CommandPalette } from '@/components/layout/command-palette';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
