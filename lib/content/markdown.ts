import { stripExtension } from './slug';

export function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
}

export function extractFirstHeading(markdown: string) {
  const body = stripFrontmatter(markdown);
  const match = body.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/m);

  return match?.[2]?.trim();
}

export function resolveTitleFallback(options: {
  frontmatterTitle?: string;
  markdown: string;
  sourcePath: string;
}) {
  const frontmatterTitle = options.frontmatterTitle?.trim();

  if (frontmatterTitle) {
    return frontmatterTitle;
  }

  const heading = extractFirstHeading(options.markdown);
  if (heading) {
    return heading;
  }

  return filenameTitle(options.sourcePath);
}

function filenameTitle(sourcePath: string) {
  const normalizedPath = sourcePath.replace(/\\/g, '/');
  const filename = normalizedPath.split('/').filter(Boolean).pop() ?? normalizedPath;
  const withoutExtension = stripExtension(filename);

  return withoutExtension.trim() || 'Untitled';
}
