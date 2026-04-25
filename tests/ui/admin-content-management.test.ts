import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('admin content management', () => {
  it('shows every synced item with publish controls and a detail link', () => {
    const listPage = read('app/admin/content/page.tsx');

    expect(listPage).not.toContain('take: 50');
    expect(listPage).toContain('发布状态');
    expect(listPage).toContain('name="published"');
    expect(listPage).toContain('sync_scanned');
    expect(listPage).toContain('写入');
    expect(listPage).toContain('查看正文');
    expect(listPage).toContain('/admin/content/${encodeURIComponent(item.id)}');
  });

  it('adds a detail page for full body review and permission management', () => {
    const detailPath = 'app/admin/content/[id]/page.tsx';

    expect(existsSync(join(root, detailPath))).toBe(true);

    const detailPage = read(detailPath);

    expect(detailPage).toContain('findContentItemById');
    expect(detailPage).toContain('MarkdownRenderer');
    expect(detailPage).toContain('权限与发布');
    expect(detailPage).toContain('Markdown 源文');
    expect(detailPage).toContain('name="returnTo"');
    expect(detailPage).toContain('name="published"');
  });

  it('keeps metadata form redirects on the current admin page', () => {
    const route = read('app/api/admin/content/[id]/metadata/route.ts');

    expect(route).toContain('buildMetadataRedirectLocation');
    expect(route).toContain("key === 'returnTo'");
    expect(route).not.toContain('new URL(`/admin/content?error=');
  });
});
