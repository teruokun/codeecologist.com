import { getEntry } from 'astro:content';
import { ALLOW_PLACEHOLDERS } from 'astro:env/server';

/** Marker that starts every unapproved placeholder value in home.yaml. */
export const PLACEHOLDER_PREFIX = 'TODO(jeff)';

/**
 * True once Jeff has written real copy: the value is present, not empty and
 * not a placeholder. Optional claims that are left empty or deleted are
 * therefore never shown.
 */
export function isFilled(value: string | undefined): value is string {
  if (value === undefined) return false;
  const trimmed = value.trim();
  return trimmed !== '' && !trimmed.startsWith(PLACEHOLDER_PREFIX);
}

/** The homepage copy from src/content/site/home.yaml. */
export async function getHomeCopy() {
  const entry = await getEntry('site', 'home');
  if (!entry) {
    throw new Error('src/content/site/home.yaml has no "home" entry');
  }
  return entry.data;
}

/**
 * Whether this build is allowed to ship placeholder copy. When it is, every
 * page carries a "draft site" banner.
 */
export const allowPlaceholders = ALLOW_PLACEHOLDERS;
