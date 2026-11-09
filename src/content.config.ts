import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.string().min(1);

// Tests point this at a fixture directory so that src/content never holds
// test entries. Declared here because the project has no Node type package.
declare const process: { env: Record<string, string | undefined> };
const contentRoot = process.env.CONTENT_ROOT ?? 'src/content';

const markdownIn = (name: string) =>
  glob({ base: `${contentRoot}/${name}`, pattern: '**/*.md' });

const sectionCopy = z.object({ heading: text, subtitle: text });

// Only talks that have already been given may be listed. There is no
// "upcoming" or "proposed" status: a future date fails the build.
const talks = defineCollection({
  loader: markdownIn('talks'),
  schema: z.object({
    title: text,
    event: text,
    location: text.optional(),
    date: z.coerce
      .date()
      .refine((date) => date <= new Date(), 'Only talks already given may be listed'),
    slidesUrl: z.url().optional(),
    videoUrl: z.url().optional(),
    abstract: text.optional(),
    draft: z.boolean().default(false),
  }),
});

const essays = defineCollection({
  loader: markdownIn('essays'),
  schema: z.object({
    title: text,
    description: text,
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    ogImage: text.optional(),
  }),
});

const news = defineCollection({
  loader: markdownIn('news'),
  schema: z.object({
    title: text,
    date: z.coerce.date(),
    link: z.url().optional(),
    draft: z.boolean().default(false),
  }),
});

const site = defineCollection({
  loader: file('src/content/site/home.yaml'),
  schema: z.object({
    site_name: text,
    meta_description: text,
    hero: z.object({
      eyebrow: text,
      headline: text,
      lead: text,
      primary_cta: text,
      secondary_cta: text,
      availability: text,
      graph_alt: text,
      graph_label_root: text,
      graph_label_keystone: text,
    }),
    services: z.object({
      heading: text,
      subtitle: text,
      items: z.array(z.object({ title: text, body: text, tag: text })),
    }),
    proof: z.array(
      z.object({
        lead: text,
        rest: text,
        hidden_until_filled: z.boolean().default(false),
      }),
    ),
    talks: sectionCopy,
    writing: sectionCopy,
    news: sectionCopy,
    open_source: z.object({
      heading: text,
      subtitle: text,
      items: z.array(
        z.object({ title: text, url: z.url().optional(), body: text, tag: text }),
      ),
    }),
    contact: z.object({
      heading: text,
      subtitle: text,
      response_time: text,
      booking_title: text,
      booking_cta: text,
      booking_url: text,
      topic_label: text,
      other_topic: text,
    }),
    footer: z.object({
      owner: text,
      location: text,
      business_name: text,
      email: text,
      github_url: text,
      linkedin_url: text,
    }),
  }),
});

export const collections = { site, talks, essays, news };
