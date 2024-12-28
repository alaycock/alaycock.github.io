import { type Block } from 'notion-types';
import { defaultMapImageUrl, normalizeUrl } from 'notion-utils';

import { defaultPageCover, defaultPageIcon } from './config';

// https://stackoverflow.com/a/52171480/1769777
/* eslint-disable unicorn/prefer-code-point, unicorn/numeric-separators-style */
const hash = (str: string) => {
  const seed = 0;
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
/* eslint-enable */

export const mapImageUrlToNotion = (url: string | undefined, block: Block) => {
  if (url === defaultPageCover || url === defaultPageIcon) {
    return url;
  }

  const newUrl = defaultMapImageUrl(url, block);

  const mappedUrl = new URL(newUrl);
  // TODO: Don't hardcode these
  mappedUrl.searchParams.set('spaceId', '85558a84-ecc8-4996-91a0-8c383b62445f');
  mappedUrl.searchParams.set('userId', '3f8c06c0-45e0-4bd1-b50d-fe3d0ba7b6ec');

  return mappedUrl.toString();
};

export const mapImageUrlToLocal = (url: string | undefined, block: Block) => {
  const notionUrl = mapImageUrlToNotion(url, block);
  const urlHash = hash(normalizeUrl(notionUrl));
  const filename = `/images/${urlHash}.jpeg`;
  console.log('Mapping', { notionUrl, urlHash });
  return filename;
};
