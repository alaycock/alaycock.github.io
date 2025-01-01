import { type Block } from 'notion-types';
import { defaultMapImageUrl, normalizeUrl } from 'notion-utils';

import { defaultPageCover, defaultPageIcon } from './config';
import { hash } from './hash';

// These aren't sensitive. They're tree-shaken out of the client bundle.
const spaceId = process.env.NOTION_SPACE;
const userId = process.env.NOTION_ACTIVE_USER;

export const mapImageUrlToNotion = (url: string | undefined, block: Block) => {
  if (url === defaultPageCover || url === defaultPageIcon) {
    return url;
  }

  const newUrl = defaultMapImageUrl(url, block);

  const mappedUrl = new URL(newUrl);
  mappedUrl.searchParams.set('spaceId', spaceId);
  mappedUrl.searchParams.set('userId', userId);

  return mappedUrl.toString();
};

export const mapImageUrlToLocal = (url: string | undefined, block: Block) => {
  const notionUrl = mapImageUrlToNotion(url, block);
  const urlHash = hash(normalizeUrl(notionUrl));
  const filename = `/images/${urlHash}.jpeg`;
  return filename;
};
