/**
 * Root layout for The Audit Brief.
 *
 * Key responsibilities:
 * - Loads Geist font family
 * - Wraps app with ThemeProvider (dark/light mode via next-themes)
 * - Provides AudioProvider for persistent global audio element
 * - Provides Sonner toast notifications
 * - Sets global metadata
 */
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { SessionProvider } from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { CommandPalette } from '@/components/layout/command-palette';
import { AudioProvider } from '@/components/audio-player/audio-context';
import { GlobalAudioPlayer } from '@/components/audio-player/global-audio-player';
import { Toaster } from 'sonner';
import './globals.css';

const geistSans = localFont({
  src: '../public/fonts/GeistVF.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});

const geistMono = localFont({
  src: '../public/fonts/GeistMonoVF.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Audit Brief',
  description: 'Internal audio platform for audit professionals',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AudioProvider>
              <CommandPalette />
              <GlobalAudioPlayer />
              {children}
              <Toaster richColors position="bottom-right" />
            </AudioProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
