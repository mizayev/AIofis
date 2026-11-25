/**
 * AI OFFICE — Instagram publishing requirements (shared rules).
 *
 * IMPORTANT: Instagram changes its rules. Re-check these numbers against
 * Instagram's current help pages before going live.
 * Last reviewed: November 2026.
 *  - Caption: up to 2,200 characters.
 *  - Hashtags: Instagram moved to a 5-hashtag cap per post/Reel (rolled out from December 2025).
 */
import type { InstagramFormat } from './types';

export const INSTAGRAM_LIMITS = Object.freeze({
  captionMaxChars: 2200,
  maxHashtags: 5,
  sizes: Object.freeze({
    post: Object.freeze({ width: 1080, height: 1350 }), // 4:5 portrait feed post
    story: Object.freeze({ width: 1080, height: 1920 }), // 9:16
    reel: Object.freeze({ width: 1080, height: 1920 }), // 9:16
  }) satisfies Record<InstagramFormat, { width: number; height: number }>,
});

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;

export function countHashtags(text: string): number {
  return (text.match(HASHTAG_RE) ?? []).length;
}

/** "kuzgi menyu" -> "#kuzgimenyu", "#Latte" -> "#Latte" */
export function normalizeHashtag(tag: string): string {
  const compact = tag.trim().replace(/\s+/g, '');
  return compact.startsWith('#') ? compact : `#${compact}`;
}
