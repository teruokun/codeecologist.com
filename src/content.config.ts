import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

const text = z.string().min(1);

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

export const collections = { site };
