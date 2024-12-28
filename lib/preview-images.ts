import fs from 'node:fs';
import fsPromises from 'node:fs/promises';

import ky from 'ky';
import lqip from 'lqip-modern';
import {
  type ExtendedRecordMap,
  type PreviewImage,
  type PreviewImageMap,
} from 'notion-types';
import { getPageImageUrls, normalizeUrl } from 'notion-utils';
import pMap from 'p-map';
import pMemoize from 'p-memoize';

import { defaultPageCover, defaultPageIcon } from './config';
import { db } from './db';
import { mapImageUrlToNotion } from './map-image-url';

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

const cookie = `notion_user_id=${process.env.NOTION_ACTIVE_USER}; token_v2=${process.env.NOTION_TOKEN_V2}`;

export async function getPreviewImageMap(
  recordMap: ExtendedRecordMap,
): Promise<PreviewImageMap> {
  const urls: string[] = getPageImageUrls(recordMap, {
    mapImageUrl: mapImageUrlToNotion,
  })
    .concat([defaultPageIcon, defaultPageCover])
    .filter(Boolean);

  // Download and store the images
  for (const url of urls) {
    const filename = `public/images/${hash(normalizeUrl(url))}.jpeg`;

    let exists = true;
    try {
      await fsPromises.stat(filename);
    } catch (err) {
      if (err.code === 'ENOENT') exists = false;
      else throw err;
    }

    console.log('Downloading', { url, filename });
    if (!exists) {
      const body = await ky(url, { headers: { cookie } }).arrayBuffer();
      fs.writeFile(
        filename,
        new DataView(body),
        (err) => err && console.log('err', err),
      );
    }
  }

  const previewImagesMap = Object.fromEntries(
    await pMap(
      urls,
      async (url) => {
        const cacheKey = normalizeUrl(url);
        return [cacheKey, await getPreviewImage(url, { cacheKey })];
      },
      {
        concurrency: 8,
      },
    ),
  );

  return previewImagesMap;
}

async function createPreviewImage(
  url: string,
  { cacheKey }: { cacheKey: string },
): Promise<PreviewImage | null> {
  try {
    try {
      const cachedPreviewImage = await db.get(cacheKey);
      if (cachedPreviewImage) {
        return cachedPreviewImage;
      }
    } catch (err) {
      // ignore redis errors
      console.warn(`redis error get "${cacheKey}"`, err.message);
    }

    // TODO: This has already been downloaded, read the file instead
    const body = await ky(url, { headers: { cookie } }).arrayBuffer();
    const result = await lqip(body);

    console.log('lqip', { ...result.metadata, url, cacheKey });

    const previewImage = {
      originalWidth: result.metadata.originalWidth,
      originalHeight: result.metadata.originalHeight,
      dataURIBase64: result.metadata.dataURIBase64,
    };

    try {
      await db.set(cacheKey, previewImage);
    } catch (err) {
      // ignore redis errors
      console.warn(`redis error set "${cacheKey}"`, err.message);
    }

    return previewImage;
  } catch (err) {
    console.warn('failed to create preview image', url, err.message);
    return null;
  }
}

export const getPreviewImage = pMemoize(createPreviewImage);
