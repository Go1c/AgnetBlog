import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

describe('runtime public blog source', () => {
  it('renders synced database content instead of the bundled sample collection', () => {
    const indexPage = read('app/(site)/blog/page.tsx');
    const postPage = read('app/(site)/blog/[...slug]/page.tsx');
    const samplePost = read('content/blog/hello-world.mdx');

    expect(indexPage).toContain('listPublicContentItems');
    expect(indexPage).not.toContain("from '@/lib/source'");
    expect(postPage).toContain('findReadableContentItemByTypeAndSlug');
    expect(postPage).not.toContain("from '@/lib/source'");
    expect(postPage).not.toContain('generateStaticParams');
    expect(samplePost).toContain('published: false');
  });
});
