import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('admin manual sync button', () => {
  it('exposes manual GitHub sync from the content page', () => {
    const contentPage = read('app/admin/content/page.tsx');

    expect(contentPage).toContain('action="/api/admin/sync"');
    expect(contentPage).toContain('立即同步');
    expect(contentPage).toContain('name="returnTo"');
    expect(contentPage).toContain('/admin/content');
  });
});
