import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getHomeCopy } from '../lib/copy';
import { getFeedItems } from '../lib/published';

// Essays and news that are not drafts, newest first. An empty feed is still
// valid; it is simply not linked from the site until it has items.
export async function GET(context: APIContext) {
  const copy = await getHomeCopy();
  if (!context.site) throw new Error('`site` must be set in astro.config.mjs');
  return rss({
    title: copy.site_name,
    description: copy.meta_description,
    site: context.site,
    items: await getFeedItems(),
  });
}
