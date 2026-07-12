// SPDX-License-Identifier: Apache-2.0
import { RootProvider } from 'fumadocs-ui/provider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const TITLE = 'Nema — your coding agents write the docs, you approve the PR';
const DESCRIPTION =
  'Your coding agents write the docs; you approve the PR. Open-source docs platform with human-gated review, git-diffable provenance, gate checks, and code-drift tracking.';

export const metadata: Metadata = {
  metadataBase: new URL('https://getnema.vercel.app'),
  title: { default: TITLE, template: '%s · Nema' },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Nema',
    type: 'website',
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
