import type { ReactNode } from 'react';

type MarkdownRendererProps = {
  content?: string | null;
};

type MarkdownBlock =
  | { type: 'heading'; depth: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; language?: string; code: string }
  | { type: 'hr' };

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const blocks = parseMarkdownBlocks(content ?? '');

  if (blocks.length === 0) {
    return <p className="text-stone-500">这篇内容还没有正文。</p>;
  }

  return <div className="space-y-5">{blocks.map((block, index) => renderBlock(block, index))}</div>;
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  const paragraph: string[] = [];
  let codeFence: { language?: string; lines: string[] } | null = null;

  function flushParagraph() {
    if (paragraph.length === 0) {
      return;
    }

    blocks.push({
      type: 'paragraph',
      text: paragraph.join(' ').trim(),
    });
    paragraph.length = 0;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const fence = line.match(/^```(\S+)?\s*$/);

    if (codeFence) {
      if (fence) {
        blocks.push({
          type: 'code',
          language: codeFence.language,
          code: codeFence.lines.join('\n'),
        });
        codeFence = null;
      } else {
        codeFence.lines.push(line);
      }
      continue;
    }

    if (fence) {
      flushParagraph();
      codeFence = { language: fence[1], lines: [] };
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        depth: heading[1]?.length ?? 2,
        text: heading[2]?.trim() ?? '',
      });
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      blocks.push({ type: 'hr' });
      continue;
    }

    const list = collectList(lines, index);
    if (list) {
      flushParagraph();
      blocks.push({
        type: 'list',
        ordered: list.ordered,
        items: list.items,
      });
      index = list.nextIndex - 1;
      continue;
    }

    if (line.startsWith('>')) {
      flushParagraph();
      const quote = collectBlockquote(lines, index);
      blocks.push({
        type: 'blockquote',
        text: quote.text,
      });
      index = quote.nextIndex - 1;
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();

  if (codeFence) {
    blocks.push({
      type: 'code',
      language: codeFence.language,
      code: codeFence.lines.join('\n'),
    });
  }

  return blocks;
}

function collectList(lines: string[], startIndex: number) {
  const first = lines[startIndex]?.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
  if (!first) {
    return null;
  }

  const ordered = /\d+\./.test(first[2] ?? '');
  const items: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const match = lines[index]?.match(/^(\s*)([-*+]|\d+\.)\s+(.+)$/);
    if (!match || /\d+\./.test(match[2] ?? '') !== ordered) {
      break;
    }

    items.push(match[3]?.trim() ?? '');
    index += 1;
  }

  return {
    ordered,
    items,
    nextIndex: index,
  };
}

function collectBlockquote(lines: string[], startIndex: number) {
  const quote: string[] = [];
  let index = startIndex;

  while (index < lines.length && lines[index]?.startsWith('>')) {
    quote.push((lines[index] ?? '').replace(/^>\s?/, '').trim());
    index += 1;
  }

  return {
    text: quote.join(' '),
    nextIndex: index,
  };
}

function renderBlock(block: MarkdownBlock, index: number) {
  if (block.type === 'heading') {
    const className =
      block.depth <= 2
        ? 'mt-8 text-2xl font-black tracking-tight text-stone-950'
        : 'mt-7 text-xl font-bold text-stone-950';
    const content = renderInline(block.text);

    if (block.depth === 1) {
      return (
        <h2 className={className} key={index}>
          {content}
        </h2>
      );
    }

    if (block.depth === 2) {
      return (
        <h2 className={className} key={index}>
          {content}
        </h2>
      );
    }

    return (
      <h3 className={className} key={index}>
        {content}
      </h3>
    );
  }

  if (block.type === 'paragraph') {
    return (
      <p className="text-base leading-8 text-stone-800" key={index}>
        {renderInline(block.text)}
      </p>
    );
  }

  if (block.type === 'blockquote') {
    return (
      <blockquote
        className="border-l-4 border-teal-700/50 bg-teal-50/60 px-4 py-3 text-base leading-8 text-stone-700"
        key={index}
      >
        {renderInline(block.text)}
      </blockquote>
    );
  }

  if (block.type === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul';

    return (
      <Tag
        className={`space-y-2 pl-6 text-base leading-8 text-stone-800 ${
          block.ordered ? 'list-decimal' : 'list-disc'
        }`}
        key={index}
      >
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
  }

  if (block.type === 'code') {
    return (
      <pre
        className="overflow-x-auto rounded-xl bg-stone-950 p-4 text-sm leading-6 text-stone-100"
        key={index}
      >
        <code>{block.code}</code>
      </pre>
    );
  }

  return <hr className="border-stone-900/10" key={index} />;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      nodes.push(
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-sm text-stone-900" key={match.index}>
          {match[1]}
        </code>,
      );
    } else {
      const href = normalizeHref(match[3] ?? '');
      const label = match[2] ?? href;
      nodes.push(
        <a
          className="font-semibold text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-900"
          href={href}
          key={match.index}
        >
          {label}
        </a>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function normalizeHref(href: string) {
  const trimmed = href.trim();

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed)
  ) {
    return trimmed;
  }

  return '#';
}
