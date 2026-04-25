import { renderGitHubMarkdownHtml } from '@/lib/content/github-markdown';

type MarkdownRendererProps = {
  content?: string | null;
  sourcePath?: string | null;
};

export function MarkdownRenderer({ content, sourcePath }: MarkdownRendererProps) {
  if (!content?.trim()) {
    return <p className="text-stone-500">这篇内容还没有正文。</p>;
  }

  return (
    <div
      className="github-markdown"
      dangerouslySetInnerHTML={{
        __html: renderGitHubMarkdownHtml(content, { sourcePath }),
      }}
    />
  );
}
