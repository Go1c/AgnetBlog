import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';

export const metadata: Metadata = {
  title: {
    default: 'AgnetBlog',
    template: '%s | AgnetBlog',
  },
  description: 'Personal notes, blog posts, and docs published from Markdown.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

