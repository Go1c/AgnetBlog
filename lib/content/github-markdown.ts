import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import {
  parseFragment,
  serialize,
  type DefaultTreeAdapterTypes,
} from 'parse5';

type GitHubMarkdownRepository = {
  owner: string;
  repo: string;
  branch: string;
};

type GitHubMarkdownOptions = {
  repository?: GitHubMarkdownRepository | null;
  sourcePath?: string | null;
};

type ParentNode = DefaultTreeAdapterTypes.ParentNode;
type ChildNode = DefaultTreeAdapterTypes.ChildNode;
type Element = DefaultTreeAdapterTypes.Element;

const allowedTags = new Set([
  'a',
  'abbr',
  'b',
  'blockquote',
  'br',
  'code',
  'dd',
  'del',
  'details',
  'div',
  'dl',
  'dt',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'input',
  'kbd',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]);

const droppedTags = new Set([
  'base',
  'button',
  'embed',
  'form',
  'iframe',
  'link',
  'meta',
  'object',
  'script',
  'select',
  'style',
  'textarea',
]);

const globalAttributes = new Set(['aria-label', 'dir', 'id', 'lang', 'title']);

const tagAttributes: Record<string, Set<string>> = {
  a: new Set(['href', 'rel']),
  img: new Set(['align', 'alt', 'height', 'src', 'width']),
  input: new Set(['checked', 'disabled', 'type']),
  li: new Set(['value']),
  ol: new Set(['reversed', 'start', 'type']),
  td: new Set(['align', 'colspan', 'rowspan']),
  th: new Set(['align', 'colspan', 'rowspan', 'scope']),
};

export function renderGitHubMarkdownHtml(
  markdown: string | null | undefined,
  options: GitHubMarkdownOptions = {},
) {
  const html = micromark(markdown ?? '', {
    allowDangerousHtml: true,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
  const fragment = parseFragment(html);

  sanitizeChildren(fragment, options);

  return serialize(fragment);
}

function sanitizeChildren(parent: ParentNode, options: GitHubMarkdownOptions) {
  const nextChildren: ChildNode[] = [];

  for (const child of parent.childNodes) {
    if (isCommentOrDocumentType(child)) {
      continue;
    }

    if (!isElement(child)) {
      nextChildren.push(child);
      continue;
    }

    const sanitized = sanitizeElement(child, options);
    if (sanitized.length > 0) {
      nextChildren.push(...sanitized);
    }
  }

  parent.childNodes = nextChildren;
  for (const child of nextChildren) {
    child.parentNode = parent;
  }
}

function sanitizeElement(element: Element, options: GitHubMarkdownOptions): ChildNode[] {
  const tagName = element.tagName.toLowerCase();

  if (droppedTags.has(tagName)) {
    return [];
  }

  sanitizeChildren(element, options);

  if (!allowedTags.has(tagName)) {
    return element.childNodes;
  }

  element.attrs = element.attrs.flatMap((attribute) => {
    const sanitized = sanitizeAttribute(tagName, attribute.name, attribute.value, options);

    return sanitized ? [sanitized] : [];
  });

  return [element];
}

function sanitizeAttribute(
  tagName: string,
  name: string,
  value: string,
  options: GitHubMarkdownOptions,
) {
  const attributeName = name.toLowerCase();
  const allowedForTag = tagAttributes[tagName];
  const isAllowed =
    globalAttributes.has(attributeName) ||
    allowedForTag?.has(attributeName) ||
    attributeName.startsWith('data-footnote-');

  if (!isAllowed || attributeName.startsWith('on')) {
    return undefined;
  }

  if (attributeName === 'href') {
    const href = sanitizeUrl(value, 'link');

    return href ? { name: attributeName, value: href } : undefined;
  }

  if (attributeName === 'src') {
    const src = resolveImageSource(value, options);

    return src ? { name: attributeName, value: src } : undefined;
  }

  if (attributeName === 'align') {
    return /^(left|center|right)$/i.test(value)
      ? { name: attributeName, value: value.toLowerCase() }
      : undefined;
  }

  if (attributeName === 'width' || attributeName === 'height') {
    return /^\d{1,4}%?$/.test(value) ? { name: attributeName, value } : undefined;
  }

  if (tagName === 'input') {
    if (attributeName === 'type') {
      return value === 'checkbox' ? { name: attributeName, value } : undefined;
    }

    if (attributeName === 'checked' || attributeName === 'disabled') {
      return { name: attributeName, value: '' };
    }
  }

  if (attributeName === 'rel') {
    return { name: attributeName, value: 'nofollow' };
  }

  return { name: attributeName, value };
}

function resolveImageSource(value: string, options: GitHubMarkdownOptions) {
  const safeUrl = sanitizeUrl(value, 'image');
  if (!safeUrl) {
    return undefined;
  }

  if (!isRepositoryRelativeUrl(safeUrl)) {
    return safeUrl;
  }

  const repository = options.repository === undefined ? repositoryFromEnv() : options.repository;
  if (!repository || !options.sourcePath) {
    return safeUrl;
  }

  const { path, suffix } = splitUrlPathAndSuffix(safeUrl);
  const repositoryPath = resolveRepositoryRelativePath(path, options.sourcePath);

  if (!repositoryPath) {
    return safeUrl;
  }

  return [
    'https://raw.githubusercontent.com',
    encodePathSegment(repository.owner),
    encodePathSegment(repository.repo),
    encodePath(repository.branch),
    encodePath(repositoryPath),
  ].join('/') + suffix;
}

function sanitizeUrl(value: string, kind: 'image' | 'link') {
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed) || trimmed.startsWith('//')) {
    return undefined;
  }

  const scheme = trimmed.match(/^([A-Za-z][A-Za-z\d+.-]*):/)?.[1]?.toLowerCase();
  if (!scheme) {
    return trimmed;
  }

  if (scheme === 'http' || scheme === 'https') {
    return trimmed;
  }

  if (kind === 'link' && scheme === 'mailto') {
    return trimmed;
  }

  return undefined;
}

function isRepositoryRelativeUrl(value: string) {
  return !/^[A-Za-z][A-Za-z\d+.-]*:/.test(value) && !value.startsWith('#');
}

function splitUrlPathAndSuffix(value: string) {
  const match = value.match(/^([^?#]*)(.*)$/);

  return {
    path: match?.[1] ?? value,
    suffix: match?.[2] ?? '',
  };
}

function resolveRepositoryRelativePath(value: string, sourcePath: string) {
  const normalizedSourcePath = sourcePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const sourceDirectory = normalizedSourcePath.split('/').slice(0, -1).join('/');
  const rawPath = value.startsWith('/')
    ? value.replace(/^\/+/, '')
    : `${sourceDirectory}/${value}`;
  const segments: string[] = [];

  for (const segment of rawPath.replace(/\\/g, '/').split('/')) {
    const decoded = decodePathSegment(segment);

    if (!decoded || decoded === '.') {
      continue;
    }

    if (decoded === '..') {
      segments.pop();
      continue;
    }

    segments.push(decoded);
  }

  return segments.join('/');
}

function repositoryFromEnv(): GitHubMarkdownRepository | null {
  const owner = process.env.GITHUB_NOTES_OWNER?.trim();
  const repo = process.env.GITHUB_NOTES_REPO?.trim();
  const branch = process.env.GITHUB_NOTES_BRANCH?.trim() || 'main';

  if (!owner || !repo) {
    return null;
  }

  return { owner, repo, branch };
}

function encodePath(path: string) {
  return path.split('/').map(encodePathSegment).join('/');
}

function encodePathSegment(segment: string) {
  return encodeURIComponent(segment);
}

function decodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function isElement(node: ChildNode): node is Element {
  return 'tagName' in node;
}

function isCommentOrDocumentType(node: ChildNode) {
  return node.nodeName === '#comment' || node.nodeName === '#documentType';
}
