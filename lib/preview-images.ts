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
import { hash } from './hash';
import { mapImageUrlToNotion } from './map-image-url';

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

    const body = await fsPromises.readFile(
      `public/images/${hash(normalizeUrl(url))}.jpeg`,
    );
    const result = await lqip(body);

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
