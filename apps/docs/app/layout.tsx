// SPDX-License-Identifier: Apache-2.0
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Nema Docs',
  description: 'Dogfood docs site authored through the Nema producer loop.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
