import { describe, expect, it } from 'vitest';

import {
  findDirectoryPolicy,
  resolveDirectoryPolicy,
} from '@/lib/content/policy';
import type { DirectoryPolicyInput } from '@/lib/content/types';

const policies: DirectoryPolicyInput[] = [
  {
    pathPrefix: 'content/docs',
    defaults: {
      contentType: 'docs',
      visibility: 'private',
      tags: ['docs'],
    },
  },
  {
    pathPrefix: 'content/docs/platform',
    defaults: {
      contentType: 'docs',
      visibility: 'public',
      tags: ['platform'],
    },
  },
];

describe('directory policy resolution', () => {
  it('selects the longest matching path prefix', () => {
    expect(findDirectoryPolicy('content/docs/platform/auth.md', policies)?.pathPrefix).toBe(
      'content/docs/platform',
    );
  });

  it('lets file frontmatter override directory defaults', () => {
    const result = resolveDirectoryPolicy('content/docs/platform/auth.md', policies, {
      visibility: 'unlisted',
      title: 'Auth',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.metadata).toMatchObject({
        contentType: 'docs',
        visibility: 'unlisted',
        tags: ['platform'],
        title: 'Auth',
      });
    }
  });
});
