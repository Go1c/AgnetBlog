/* eslint-disable @next/next/no-img-element */
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import {
  AlertTriangle,
  Bug,
  Check,
  CircleHelp,
  Flame,
  Info,
  List,
  Quote,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  getMediaKind,
  resolveImageSource,
  resolveMediaSource,
  transformObsidianSyntax,
  type GitHubMarkdownOptions,
} from '@/lib/content/github-markdown';

type MarkdownRendererProps = {
  content?: string | null;
  sourcePath?: string | null;
};

type CalloutConfig = {
  border: string;
  bg: string;
  text: string;
  icon: LucideIcon;
};

type Callout = {
  type: string;
  title: string;
  foldable: boolean;
  defaultOpen: boolean;
  restChildren: ReactNode[];
};

const calloutTitlePattern = /^\[!(\w+)\]([+-])?\s*(.*)?$/;

const calloutStyles: Record<string, CalloutConfig> = {
  note: { border: 'border-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-400', icon: Info },
  abstract: { border: 'border-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-400', icon: List },
  summary: { border: 'border-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-400', icon: List },
  tldr: { border: 'border-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-400', icon: List },
  info: { border: 'border-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-400', icon: Info },
  todo: { border: 'border-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-400', icon: Info },
  tip: { border: 'border-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-400', icon: Flame },
  hint: { border: 'border-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-400', icon: Flame },
  important: { border: 'border-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-400', icon: Flame },
  success: { border: 'border-green-400', bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-400', icon: Check },
  check: { border: 'border-green-400', bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-400', icon: Check },
  done: { border: 'border-green-400', bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-400', icon: Check },
  question: { border: 'border-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-400', icon: CircleHelp },
  help: { border: 'border-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-400', icon: CircleHelp },
  faq: { border: 'border-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-400', icon: CircleHelp },
  warning: { border: 'border-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-400', icon: AlertTriangle },
  caution: { border: 'border-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-400', icon: AlertTriangle },
  attention: { border: 'border-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-400', icon: AlertTriangle },
  failure: { border: 'border-red-400', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-400', icon: X },
  fail: { border: 'border-red-400', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-400', icon: X },
  missing: { border: 'border-red-400', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-400', icon: X },
  danger: { border: 'border-red-400', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-400', icon: Zap },
  error: { border: 'border-red-400', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-400', icon: Zap },
  bug: { border: 'border-red-400', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-400', icon: Bug },
  example: { border: 'border-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-400', icon: List },
  quote: { border: 'border-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/30', text: 'text-gray-400', icon: Quote },
  cite: { border: 'border-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/30', text: 'text-gray-400', icon: Quote },
};

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark'],
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    img: [...(defaultSchema.attributes?.img ?? []), 'align', 'height', 'width'],
    pre: [...(defaultSchema.attributes?.pre ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'title'],
  },
};

export function MarkdownRenderer({ content, sourcePath }: MarkdownRendererProps) {
  if (!content?.trim()) {
    return <p className="text-stone-500">这篇内容还没有正文。</p>;
  }

  const markdown = transformObsidianSyntax(content);
  const options: GitHubMarkdownOptions = { sourcePath };

  return (
    <div className="github-markdown">
      <ReactMarkdown
        allowedElements={undefined}
        components={createMarkdownComponents(options)}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeHighlight]}
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        unwrapDisallowed
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function createMarkdownComponents(options: GitHubMarkdownOptions): Components {
  return {
    h1: ({ className, ...props }) => (
      <h1 className={cx('mt-8 mb-4 text-3xl font-bold first:mt-0', className)} {...props} />
    ),
    h2: ({ className, ...props }) => (
      <h2 className={cx('mt-7 mb-3 text-2xl font-semibold first:mt-0', className)} {...props} />
    ),
    h3: ({ className, ...props }) => (
      <h3 className={cx('mt-6 mb-3 text-xl font-semibold first:mt-0', className)} {...props} />
    ),
    p: ({ className, ...props }) => (
      <p className={cx('my-3 leading-7 text-foreground/90', className)} {...props} />
    ),
    ul: ({ className, ...props }) => (
      <ul className={cx('my-3 list-disc pl-6', className)} {...props} />
    ),
    ol: ({ className, ...props }) => (
      <ol className={cx('my-3 list-decimal pl-6', className)} {...props} />
    ),
    li: ({ className, ...props }) => <li className={cx('my-1.5', className)} {...props} />,
    blockquote: ({ className, children, ...props }) => {
      const callout = parseCallout(children);

      if (!callout) {
        return (
          <blockquote
            className={cx('my-4 border-l-4 border-border pl-4 text-muted-foreground', className)}
            {...props}
          >
            {children}
          </blockquote>
        );
      }

      const style = calloutStyles[callout.type] ?? calloutStyles.note;
      const Icon = style.icon;
      const title = (
        <>
          <Icon className="size-4 shrink-0" />
          {callout.title}
        </>
      );

      if (callout.foldable) {
        return (
          <details
            open={callout.defaultOpen}
            className={cx('my-4 border-l-4 rounded-r-lg px-4 py-3', style.border, style.bg, className)}
          >
            <summary className={cx('flex cursor-pointer items-center gap-1.5 font-semibold capitalize', style.text)}>
              {title}
            </summary>
            <div className="mt-2">{callout.restChildren}</div>
          </details>
        );
      }

      return (
        <div className={cx('my-4 border-l-4 rounded-r-lg px-4 py-3', style.border, style.bg, className)}>
          <div className={cx('mb-1 flex items-center gap-1.5 font-semibold capitalize', style.text)}>
            {title}
          </div>
          {callout.restChildren}
        </div>
      );
    },
    hr: ({ className, ...props }) => <hr className={cx('my-6 border-border', className)} {...props} />,
    table: ({ className, ...props }) => (
      <div className="markdown-table-wrapper my-4 overflow-x-auto">
        <table className={cx('w-full border-collapse text-sm', className)} {...props} />
      </div>
    ),
    thead: ({ className, ...props }) => <thead className={cx('bg-muted/50', className)} {...props} />,
    th: ({ className, ...props }) => (
      <th className={cx('border border-border px-3 py-2 text-left font-semibold', className)} {...props} />
    ),
    td: ({ className, ...props }) => (
      <td className={cx('border border-border px-3 py-2 align-top', className)} {...props} />
    ),
    img: ({ className, alt, src, ...props }) => {
      const resolvedSrc = typeof src === 'string' ? resolveImageSource(src, options) : src;

      return (
        <img
          className={cx('my-4 max-w-full rounded-lg border border-border/60', className)}
          alt={alt ?? ''}
          loading="lazy"
          src={resolvedSrc}
          {...props}
        />
      );
    },
    a: ({ className, href, children, ...props }) => {
      const kind = getHrefMediaKind(href);
      const src = href ? resolveMediaSource(href, options) : undefined;

      if (href && kind === 'video') {
        return <video src={src} controls className="my-4 w-full rounded-lg border border-border/60" />;
      }

      if (href && kind === 'audio') {
        return <audio src={src} controls className="my-4 w-full" />;
      }

      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={cx('text-primary underline underline-offset-4 hover:opacity-80', className)}
          {...props}
        >
          {children}
        </a>
      );
    },
    pre: ({ className, ...props }) => (
      <pre
        className={cx('my-4 overflow-x-auto rounded-lg border border-border/60 bg-muted/40 p-4', className)}
        {...props}
      />
    ),
    code: ({ className, children, ...props }) => {
      const value = String(children);

      if (!className && !value.includes('\n')) {
        return (
          <code className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]" {...props}>
            {children}
          </code>
        );
      }

      return (
        <code className={cx('text-sm', className)} {...props}>
          {children}
        </code>
      );
    },
    input: ({ className, type, ...props }) => {
      if (type === 'checkbox') {
        return <input type={type} disabled className={cx('mr-2 accent-primary', className)} {...props} />;
      }

      return <input type={type} className={className} {...props} />;
    },
  };
}

function parseCallout(children: ReactNode): Callout | null {
  const childArray = Children.toArray(children);
  const paragraphIndex = childArray.findIndex((child) => isValidElement(child));

  if (paragraphIndex === -1) {
    return null;
  }

  const paragraph = childArray[paragraphIndex];

  if (!isValidElement<{ children?: ReactNode }>(paragraph)) {
    return null;
  }

  const paragraphChildren = Children.toArray(paragraph.props.children);
  const textIndex = paragraphChildren.findIndex((child) => typeof child === 'string');

  if (textIndex === -1) {
    return null;
  }

  const text = String(paragraphChildren[textIndex]);
  const [firstLine = '', ...restLines] = text.split('\n');
  const match = firstLine.trimStart().match(calloutTitlePattern);

  if (!match) {
    return null;
  }

  const [, rawType = 'note', foldMarker, rawTitle] = match;
  const type = rawType.toLowerCase();
  const title = rawTitle?.trim() || `${rawType.charAt(0).toUpperCase()}${rawType.slice(1)}`;
  const restText = restLines.join('\n').trimStart();
  const nextParagraphChildren = [
    ...paragraphChildren.slice(0, textIndex),
    ...(restText ? [restText] : []),
    ...paragraphChildren.slice(textIndex + 1),
  ];
  const restChildren: ReactNode[] = [];

  if (nextParagraphChildren.length > 0) {
    restChildren.push(
      cloneElement(paragraph as ReactElement<{ children?: ReactNode }>, { key: 'callout-body' }, nextParagraphChildren),
    );
  }

  restChildren.push(...childArray.slice(paragraphIndex + 1));

  return {
    type,
    title,
    foldable: foldMarker === '+' || foldMarker === '-',
    defaultOpen: foldMarker !== '-',
    restChildren,
  };
}

function getHrefMediaKind(href: string | undefined) {
  if (!href) {
    return 'file';
  }

  try {
    const url = new URL(href, 'http://localhost');

    return getMediaKind(url.searchParams.get('path') ?? href);
  } catch {
    return getMediaKind(href);
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
