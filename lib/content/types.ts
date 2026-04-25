export type ContentType = 'blog' | 'docs';

export type Visibility = 'private' | 'public' | 'unlisted';

export type PublishFrontmatter = {
  title?: string;
  date?: string;
  updatedAt?: string;
  summary?: string;
  tags?: string[];
  contentType?: ContentType;
  visibility?: Visibility;
  slug?: string;
  docSection?: string;
  cover?: string;
  published?: boolean;
};

export type ContentPipelineIssue = {
  code: string;
  message: string;
  field?: string;
  path?: string;
};

export type DirectoryPolicyDefaults = Pick<
  PublishFrontmatter,
  | 'contentType'
  | 'visibility'
  | 'published'
  | 'tags'
  | 'docSection'
  | 'summary'
  | 'cover'
  | 'date'
  | 'updatedAt'
>;

export type DirectoryPolicyInput = {
  pathPrefix: string;
  defaults: DirectoryPolicyDefaults;
};

export type EffectiveContentMetadata = PublishFrontmatter & {
  contentType: ContentType;
  visibility: Visibility;
  published: boolean;
  tags: string[];
  slug: string;
  title: string;
};

export type IngestFileInput = {
  path: string;
  content: string;
  relativePath?: string;
};

export type IngestSourceRoots =
  | string
  | Partial<Record<ContentType, string>>;

export type IngestOptions = {
  sourceRoot?: IngestSourceRoots;
};

export type IngestSuccess = {
  path: string;
  metadata: EffectiveContentMetadata;
  body: string;
};

export type IngestFailure = {
  path: string;
  errors: ContentPipelineIssue[];
};

export type IngestResult = {
  successes: IngestSuccess[];
  failures: IngestFailure[];
};
