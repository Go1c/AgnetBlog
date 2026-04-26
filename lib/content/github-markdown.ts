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
type TextNode = DefaultTreeAdapterTypes.TextNode;

type MediaKind = 'image' | 'video' | 'audio' | 'file';

const allowedTags = new Set([
  'a',
  'abbr',
  'audio',
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
  'mark',
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
  'video',
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
  audio: new Set(['controls', 'src']),
  code: new Set(['class']),
  details: new Set(['class', 'data-callout', 'open']),
  div: new Set(['class', 'data-callout']),
  img: new Set(['align', 'alt', 'height', 'src', 'width']),
  input: new Set(['checked', 'disabled', 'type']),
  li: new Set(['value']),
  ol: new Set(['reversed', 'start', 'type']),
  pre: new Set(['class']),
  span: new Set(['class', 'title']),
  summary: new Set(['class']),
  td: new Set(['align', 'colspan', 'rowspan']),
  th: new Set(['align', 'colspan', 'rowspan', 'scope']),
  video: new Set(['controls', 'src']),
};

const imageExtensionPattern = /\.(png|jpe?g|gif|svg|webp|bmp)$/i;
const videoExtensionPattern = /\.(mp4|webm|mov|mkv|avi|ogv)$/i;
const audioExtensionPattern = /\.(mp3|wav|ogg|m4a|flac|aac)$/i;
const markdownImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
const htmlImagePattern = /<img\b([^>]*?)\bsrc\s*=\s*(['"])(.*?)\2([^>]*)>/gi;
const codePlaceholderPattern = /\u0000CODE_BLOCK_(\d+)\u0000/g;
const calloutTitlePattern = /^\[!(\w+)\]([+-])?\s*(.*)?$/;
const calloutTypes = new Set([
  'note',
  'abstract',
  'summary',
  'tldr',
  'info',
  'todo',
  'tip',
  'hint',
  'important',
  'success',
  'check',
  'done',
  'question',
  'help',
  'faq',
  'warning',
  'caution',
  'attention',
  'failure',
  'fail',
  'missing',
  'danger',
  'error',
  'bug',
  'example',
  'quote',
  'cite',
]);
const allowedStaticClasses = new Set([
  'obsidian-wiki-link',
  'obsidian-tag',
  'markdown-callout',
  'markdown-callout-title',
  ...Array.from(calloutTypes, (type) => `markdown-callout-${type}`),
]);

export function renderGitHubMarkdownHtml(
  markdown: string | null | undefined,
  options: GitHubMarkdownOptions = {},
) {
  const transformedMarkdown = transformObsidianSyntax(markdown ?? '');
  const html = micromark(transformedMarkdown, {
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

  if (tagName === 'blockquote') {
    const callout = transformCallout(element);

    if (callout) {
      return [callout];
    }
  }

  if (tagName === 'a') {
    const media = transformMediaLink(element, options);

    if (media) {
      return [media];
    }
  }

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

  if (attributeName === 'class') {
    return sanitizeClassAttribute(tagName, value);
  }

  if (attributeName === 'data-callout') {
    return calloutTypes.has(value) ? { name: attributeName, value } : undefined;
  }

  if (attributeName === 'href') {
    const href = sanitizeUrl(value, 'link');

    return href ? { name: attributeName, value: href } : undefined;
  }

  if (attributeName === 'src') {
    const src =
      tagName === 'img' ? resolveImageSource(value, options) : resolveMediaSource(value, options);

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

  if (attributeName === 'controls' || attributeName === 'open') {
    return { name: attributeName, value: '' };
  }

  return { name: attributeName, value };
}

function transformObsidianSyntax(markdown: string) {
  if (!markdown) {
    return markdown;
  }

  const protectedSegments: string[] = [];
  const protect = (value: string) => {
    const index = protectedSegments.length;

    protectedSegments.push(value);

    return `\u0000CODE_BLOCK_${index}\u0000`;
  };

  let output = markdown;

  output = output.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1\s*$/gm, protect);
  output = output.replace(/(`+)(?!\u0000)(.+?)\1/g, protect);
  output = output.replace(/%%[\s\S]*?%%/g, '');
  output = output.replace(/!\[\[([^\]]+)\]\]/g, transformWikiEmbed);
  output = rewriteKnownMarkdownImages(output);
  output = rewriteKnownHtmlImages(output);
  output = output.replace(/\[\[([^\]]+)\]\]/g, (_match, value: string) => {
    const [target, label] = splitWikiValue(value);
    const title = target.trim();
    const text = (label || target).trim();

    if (!title || !text) {
      return _match;
    }

    return `<span class="obsidian-wiki-link" title="${escapeHtmlAttribute(title)}">${escapeHtml(
      text,
    )}</span>`;
  });
  output = output.replace(/==(.*?)==/g, (_match, value: string) => {
    return `<mark>${escapeHtml(value)}</mark>`;
  });
  output = output.replace(
    /(^|[\s])#([a-zA-Z\u4e00-\u9fff][\w/\u4e00-\u9fff-]*)/gm,
    (_match, prefix: string, tag: string) => {
      return `${prefix}<span class="obsidian-tag">#${tag}</span>`;
    },
  );

  return output.replace(codePlaceholderPattern, (_match, index: string) => {
    return protectedSegments[Number(index)] ?? _match;
  });
}

function transformWikiEmbed(match: string, value: string) {
  const [rawTarget, rawDisplay] = splitWikiValue(value);
  const target = rawTarget.split('#')[0]?.trim() ?? '';

  if (!target) {
    return match;
  }

  const display = (rawDisplay || target).trim();
  const kind = getMediaKind(target);

  if (kind === 'image') {
    const width = rawDisplay?.trim().match(/^(\d+)$/)?.[1];

    if (width) {
      return `<img src="${escapeHtmlAttribute(target)}" alt="${escapeHtmlAttribute(
        target,
      )}" width="${width}" />`;
    }

    return `![${escapeMarkdownImageAlt(display)}](${formatMarkdownDestination(target)})`;
  }

  if (kind === 'video') {
    return `[${escapeMarkdownText(`Video ${display}`)}](${formatMarkdownDestination(target)})`;
  }

  if (kind === 'audio') {
    return `[${escapeMarkdownText(`Audio ${display}`)}](${formatMarkdownDestination(target)})`;
  }

  return `[${escapeMarkdownText(`File ${display}`)}](${formatMarkdownDestination(target)})`;
}

function rewriteKnownMarkdownImages(markdown: string) {
  return markdown.replace(markdownImagePattern, (match, alt: string, destination: string) => {
    const parsed = parseMarkdownLinkTarget(destination);

    if (!parsed || getMediaKind(parsed.target) !== 'image') {
      return match;
    }

    return `![${alt}](${destination.slice(0, parsed.start)}${formatMarkdownDestination(
      parsed.target,
    )}${destination.slice(parsed.end)})`;
  });
}

function rewriteKnownHtmlImages(markdown: string) {
  return markdown.replace(
    htmlImagePattern,
    (match, before: string, quote: string, src: string, after: string) => {
      if (getMediaKind(src) !== 'image') {
        return match;
      }

      return `<img${before}src=${quote}${escapeHtmlAttribute(src)}${quote}${after}>`;
    },
  );
}

function parseMarkdownLinkTarget(raw: string) {
  let start = 0;

  while (start < raw.length && /\s/.test(raw[start] ?? '')) {
    start += 1;
  }

  if (start >= raw.length) {
    return null;
  }

  if (raw[start] === '<') {
    const end = raw.indexOf('>', start + 1);

    if (end === -1) {
      return null;
    }

    return {
      target: raw.slice(start + 1, end),
      start,
      end: end + 1,
    };
  }

  let end = raw.length;
  let escaped = false;

  for (let index = start; index < raw.length; index += 1) {
    const char = raw[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char && /\s/.test(char)) {
      end = index;
      break;
    }
  }

  return {
    target: raw.slice(start, end),
    start,
    end,
  };
}

function transformCallout(element: Element) {
  const paragraph = findFirstElementChild(element, 'p');
  const textNode = paragraph ? findFirstTextChild(paragraph) : undefined;
  const firstText = textNode?.value ?? '';
  const [firstLine, ...restLines] = firstText.split('\n');
  const match = firstLine?.trimStart().match(calloutTitlePattern);

  if (!match || !paragraph || !textNode) {
    return undefined;
  }

  const [, rawType = 'note', foldMarker, rawTitle] = match;
  const type = rawType.toLowerCase();
  const normalizedType = calloutTypes.has(type) ? type : 'note';
  const title = rawTitle?.trim() || `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  const restText = restLines.join('\n').trimStart();
  const bodyChildren = element.childNodes.filter((child) => child !== paragraph || restText);

  if (restText) {
    textNode.value = restText;
  }

  if (foldMarker === '+' || foldMarker === '-') {
    mutateElement(element, 'details', [
      { name: 'class', value: `markdown-callout markdown-callout-${normalizedType}` },
      { name: 'data-callout', value: normalizedType },
      ...(foldMarker === '+' ? [{ name: 'open', value: '' }] : []),
    ]);
    element.childNodes = [createElement('summary', [{ name: 'class', value: 'markdown-callout-title' }], [
      createTextNode(title),
    ]), ...bodyChildren];
  } else {
    mutateElement(element, 'div', [
      { name: 'class', value: `markdown-callout markdown-callout-${normalizedType}` },
      { name: 'data-callout', value: normalizedType },
    ]);
    element.childNodes = [
      createElement('div', [{ name: 'class', value: 'markdown-callout-title' }], [
        createTextNode(title),
      ]),
      ...bodyChildren,
    ];
  }

  setParentNodes(element);

  return element;
}

function transformMediaLink(element: Element, options: GitHubMarkdownOptions) {
  const href = getAttributeValue(element, 'href');

  if (!href) {
    return undefined;
  }

  const kind = getMediaKind(href);

  if (kind !== 'video' && kind !== 'audio') {
    return undefined;
  }

  const src = resolveMediaSource(href, options);

  if (!src) {
    return undefined;
  }

  mutateElement(element, kind, [
    { name: 'src', value: src },
    { name: 'controls', value: '' },
  ]);
  element.childNodes = [];

  return element;
}

function sanitizeClassAttribute(tagName: string, value: string) {
  const classes = value
    .split(/\s+/)
    .map((className) => className.trim())
    .filter((className) => isAllowedClassName(tagName, className));

  return classes.length > 0 ? { name: 'class', value: classes.join(' ') } : undefined;
}

function isAllowedClassName(tagName: string, className: string) {
  if (allowedStaticClasses.has(className)) {
    return true;
  }

  if ((tagName === 'code' || tagName === 'pre') && /^language-[\w-]+$/.test(className)) {
    return true;
  }

  if ((tagName === 'code' || tagName === 'pre') && /^hljs(?:-[\w-]+)?$/.test(className)) {
    return true;
  }

  return className === 'nohighlight' || className === 'no-highlight';
}

function resolveImageSource(value: string, options: GitHubMarkdownOptions) {
  const safeUrl = sanitizeUrl(value, 'image');
  if (!safeUrl) {
    return undefined;
  }

  return resolveRepositorySource(safeUrl, options);
}

function resolveMediaSource(value: string, options: GitHubMarkdownOptions) {
  const safeUrl = sanitizeUrl(value, 'image');
  if (!safeUrl) {
    return undefined;
  }

  return resolveRepositorySource(safeUrl, options);
}

function resolveRepositorySource(safeUrl: string, options: GitHubMarkdownOptions) {
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

function splitWikiValue(value: string) {
  const [target = '', ...rest] = value.split('|');

  return [target, rest[0]] as const;
}

function getMediaKind(value: string): MediaKind {
  const { path } = splitUrlPathAndSuffix(value);

  if (imageExtensionPattern.test(path)) {
    return 'image';
  }

  if (videoExtensionPattern.test(path)) {
    return 'video';
  }

  if (audioExtensionPattern.test(path)) {
    return 'audio';
  }

  return 'file';
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

function formatMarkdownDestination(value: string) {
  const escaped = value.replace(/\\/g, '\\\\').replace(/>/g, '\\>');

  return /[\s()<>]/.test(value) ? `<${escaped}>` : escaped;
}

function escapeMarkdownImageAlt(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function escapeMarkdownText(value: string) {
  return escapeMarkdownImageAlt(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function escapeHtmlAttribute(value: string) {
  return escapeHtml(value);
}

function getAttributeValue(element: Element, name: string) {
  return element.attrs.find((attribute) => attribute.name.toLowerCase() === name)?.value;
}

function mutateElement(element: Element, tagName: string, attrs: Element['attrs']) {
  element.nodeName = tagName;
  element.tagName = tagName;
  element.attrs = attrs;
}

function createElement(tagName: string, attrs: Element['attrs'], childNodes: ChildNode[] = []) {
  const element = {
    nodeName: tagName,
    tagName,
    attrs,
    namespaceURI: 'http://www.w3.org/1999/xhtml',
    childNodes,
  } as Element;

  setParentNodes(element);

  return element;
}

function createTextNode(value: string) {
  return {
    nodeName: '#text',
    value,
  } as TextNode;
}

function setParentNodes(parent: ParentNode) {
  for (const child of parent.childNodes) {
    child.parentNode = parent;

    if (isParentNode(child)) {
      setParentNodes(child);
    }
  }
}

function findFirstElementChild(parent: ParentNode, tagName: string) {
  return parent.childNodes.find((child): child is Element => {
    return isElement(child) && child.tagName.toLowerCase() === tagName;
  });
}

function findFirstTextChild(parent: ParentNode) {
  return parent.childNodes.find((child): child is TextNode => {
    return child.nodeName === '#text' && 'value' in child;
  });
}

function isElement(node: ChildNode): node is Element {
  return 'tagName' in node;
}

function isParentNode(node: ChildNode): node is ChildNode & ParentNode {
  return 'childNodes' in node;
}

function isCommentOrDocumentType(node: ChildNode) {
  return node.nodeName === '#comment' || node.nodeName === '#documentType';
}
