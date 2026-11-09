import { getCollection, type CollectionEntry } from 'astro:content';

type Dated = 'talks' | 'essays' | 'news';

/** The date an entry is sorted and displayed by. */
export function entryDate(entry: CollectionEntry<Dated>): Date {
  return 'pubDate' in entry.data ? entry.data.pubDate : entry.data.date;
}

const cache = new Map<Dated, Promise<CollectionEntry<Dated>[]>>();

async function load<Name extends Dated>(name: Name): Promise<CollectionEntry<Name>[]> {
  const entries = await getCollection(name, ({ data }) => data.draft !== true);
  return entries.sort((a, b) => entryDate(b).valueOf() - entryDate(a).valueOf());
}

/**
 * Entries of a collection that are not drafts, newest first. getCollection
 * returns entries in no guaranteed order, so the sort is required. Each
 * collection is read once per build.
 */
export function getPublished<Name extends Dated>(name: Name): Promise<CollectionEntry<Name>[]> {
  if (!cache.has(name)) cache.set(name, load(name));
  return cache.get(name) as Promise<CollectionEntry<Name>[]>;
}

/** "Nov 2026". Dates in frontmatter are read as UTC. */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** "November 9, 2026". */
export function formatDay(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** Where a news entry leads: its external link if it has one, else its own page. */
export function newsHref(entry: CollectionEntry<'news'>): string {
  return entry.data.link ?? `/news/${entry.id}/`;
}

/** Essays and news merged for the RSS feed, newest first. */
export async function getFeedItems() {
  const [essays, news] = await Promise.all([getPublished('essays'), getPublished('news')]);
  return [
    ...essays.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: `/writing/${entry.id}/`,
    })),
    ...news.map((entry) => ({
      title: entry.data.title,
      description: undefined,
      pubDate: entry.data.date,
      link: newsHref(entry),
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());
}
