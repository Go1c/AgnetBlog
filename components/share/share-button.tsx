'use client';

import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';

type ShareButtonProps = {
  title: string;
  shortUrl?: string | null;
  url?: string | null;
  className?: string;
};

export function ShareButton({ title, shortUrl, url, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyShareText() {
    const href = shortUrl ?? url ?? window.location.href;
    await navigator.clipboard.writeText(`${title}\n${href}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      className={
        className ??
        'inline-flex items-center gap-2 rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm font-semibold text-fd-foreground shadow-sm transition hover:bg-fd-accent/60 hover:text-fd-accent-foreground'
      }
      onClick={copyShareText}
      title="复制分享链接"
      type="button"
    >
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Share2 aria-hidden="true" className="size-4" />}
      {copied ? '已复制' : '分享'}
    </button>
  );
}
