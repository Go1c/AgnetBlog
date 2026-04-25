import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';

const visibilitySchema = z.enum(['private', 'public', 'unlisted']);
const frontmatterDateSchema = z.union([z.string().date(), z.date()]);

const publishFields = {
  date: frontmatterDateSchema.optional(),
  updatedAt: frontmatterDateSchema.optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  visibility: visibilitySchema.default('public'),
  slug: z.string().optional(),
  docSection: z.string().optional(),
  cover: z.string().optional(),
  published: z.boolean().default(true),
};

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: frontmatterSchema.extend({
      ...publishFields,
      contentType: z.literal('docs').default('docs'),
    }),
  },
});

export const blogPosts = defineCollections({
  type: 'doc',
  dir: 'content/blog',
  schema: frontmatterSchema.extend({
    ...publishFields,
    contentType: z.literal('blog').default('blog'),
  }),
});

export default defineConfig();
