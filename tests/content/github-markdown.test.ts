import { describe, expect, it } from 'vitest';

import { renderGitHubMarkdownHtml } from '@/lib/content/github-markdown';

describe('GitHub-style markdown rendering', () => {
  it('renders GFM tables, task lists, autolinks, and strikethrough text', () => {
    const html = renderGitHubMarkdownHtml(`| Name | Done |
| --- | --- |
| Sync | yes |

- [x] publish docs

~~old copy~~

https://example.com`);

    expect(html).toContain('<table>');
    expect(html).toContain('<input type="checkbox" disabled="" checked="">');
    expect(html).toContain('<del>old copy</del>');
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
  });

  it('renders GitHub-compatible HTML images and resolves relative attachment paths', () => {
    const html = renderGitHubMarkdownHtml(
      '<img src="file-20260425231312615.jpg" width="400" onclick="bad()">',
      {
        repository: {
          owner: 'lumio',
          repo: 'notes',
          branch: 'main',
        },
        sourcePath: '帮助文档/CC Switch.md',
      },
    );

    expect(html).toContain(
      '<img src="https://raw.githubusercontent.com/lumio/notes/main/%E5%B8%AE%E5%8A%A9%E6%96%87%E6%A1%A3/file-20260425231312615.jpg" width="400">',
    );
    expect(html).not.toContain('onclick');
  });

  it('removes dangerous HTML while keeping allowed markdown output', () => {
    const html = renderGitHubMarkdownHtml(
      '<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n<strong>safe</strong>',
    );

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<strong>safe</strong>');
  });

  it('renders Obsidian-style markdown syntax used by the reference editor', () => {
    const html = renderGitHubMarkdownHtml(
      `%%hidden note%%

[[Roadmap|路线图]] and ==marked text== #重要/todo

\`[[literal]] ==no mark== #raw\`

![[assets/photo.png|320]]

[demo](media/demo.mp4)

> [!WARNING]- 注意
> 保持格式`,
      {
        repository: {
          owner: 'lumio',
          repo: 'notes',
          branch: 'main',
        },
        sourcePath: 'docs/page.md',
      },
    );

    expect(html).not.toContain('hidden note');
    expect(html).toContain('<span class="obsidian-wiki-link" title="Roadmap">路线图</span>');
    expect(html).toContain('<mark>marked text</mark>');
    expect(html).toContain('<span class="obsidian-tag">#重要/todo</span>');
    expect(html).toContain('<code>[[literal]] ==no mark== #raw</code>');
    expect(html).toContain(
      '<img src="https://raw.githubusercontent.com/lumio/notes/main/docs/assets/photo.png" alt="assets/photo.png" width="320">',
    );
    expect(html).toContain(
      '<video src="https://raw.githubusercontent.com/lumio/notes/main/docs/media/demo.mp4" controls=""></video>',
    );
    expect(html).toContain(
      '<details class="markdown-callout markdown-callout-warning" data-callout="warning">',
    );
    expect(html).toContain('<summary class="markdown-callout-title">注意</summary>');
  });
});
