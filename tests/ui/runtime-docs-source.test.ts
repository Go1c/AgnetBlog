import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('runtime public docs source', () => {
  it('renders synced database docs before falling back to bundled Fumadocs content', () => {
    const docsPage = read('app/(site)/docs/[[...slug]]/page.tsx');

    expect(docsPage).toContain('findReadableContentItemByTypeAndSlug');
    expect(docsPage).toContain('listPublicContentItems');
    expect(docsPage).toContain('routeSlugSegmentsToContentSlug');
    expect(docsPage).toContain('runtimeContentUrl');
    expect(docsPage).toContain('MarkdownRenderer');
    expect(docsPage).toContain('ContentType.DOCS');
  });

  it('lists runtime public docs on the docs index so published docs are discoverable', () => {
    const docsPage = read('app/(site)/docs/[[...slug]]/page.tsx');

    expect(docsPage).toContain('RuntimeDocsList');
    expect(docsPage).toContain('公开文档');
    expect(docsPage).toContain('slug.length === 0');
  });
});
