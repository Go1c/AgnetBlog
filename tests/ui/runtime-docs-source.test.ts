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
    expect(docsPage).toContain('routeSlugSegmentsToContentSlug');
    expect(docsPage).toContain('MarkdownRenderer');
    expect(docsPage).toContain('ContentType.DOCS');
  });
});
