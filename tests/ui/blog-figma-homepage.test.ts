import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('Figma blog homepage implementation', () => {
  it('keeps the Figma CodeNote structure and content on the blog index', () => {
    const page = read('app/(site)/blog/page.tsx');

    expect(page).toContain('CodeNote');
    expect(page).toContain('记录技术，思考世界。');
    expect(page).toContain('本周编辑推荐');
    expect(page).toContain('技术笔记');
    expect(page).toContain('开源项目');
    expect(page).toContain('listPublicContentItems');
    expect(page).toContain('runtimeContentUrl');
  });

  it('does not embed executable script tags inside React components', () => {
    const page = read('app/(site)/blog/page.tsx');

    expect(page).not.toMatch(/<script[\s>]/i);
  });

  it('keeps a static Figma fallback when the runtime database is unavailable', () => {
    const page = read('app/(site)/blog/page.tsx');

    expect(page).toContain('safeListPublicBlogPosts');
    expect(page).toContain('catch');
    expect(page).toContain('fallbackArticles');
  });
});
