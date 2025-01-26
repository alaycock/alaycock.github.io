import {
  type ExtendedRecordMap,
  type SearchParams,
  type SearchResults,
} from 'notion-types';
import { mergeRecordMaps } from 'notion-utils';
import pMap from 'p-map';
import pMemoize from 'p-memoize';

import {
  isPreviewImageSupportEnabled,
  navigationLinks,
  navigationStyle,
} from './config';
import { notion } from './notion-api';
import { getPreviewImageMap } from './preview-images';

const getNavigationLinkPages = pMemoize(
  async (): Promise<ExtendedRecordMap[]> => {
    const navigationLinkPageIds = (navigationLinks || [])
      .map((link) => link.pageId)
      .filter(Boolean);

    if (navigationStyle !== 'default' && navigationLinkPageIds.length) {
      return pMap(
        navigationLinkPageIds,
        async (navigationLinkPageId) => {
          return notion.getPage(navigationLinkPageId, {
            chunkLimit: 1,
            fetchMissingBlocks: false,
            fetchCollections: false,
            signFileUrls: false,
          });
        },
        {
          concurrency: 4,
        },
      );
    }

    return [];
  },
);

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
  let recordMap = await notion.getPage(pageId);

  if (navigationStyle !== 'default') {
    // ensure that any pages linked to in the custom navigation header have
    // their block info fully resolved in the page record map so we know
    // the page title, slug, etc.
    const navigationLinkRecordMaps = await getNavigationLinkPages();

    if (navigationLinkRecordMaps?.length) {
      recordMap = navigationLinkRecordMaps.reduce(
        (map, navigationLinkRecordMap) =>
          mergeRecordMaps(map, navigationLinkRecordMap),
        recordMap,
      );
    }
  }

  const collectionsToFetch = new Set<string>();
  for (const collectionId in recordMap.collection) {
    const collection = recordMap.collection[collectionId].value;
    for (const schemaItemId in collection.schema) {
      const schemaItem = collection.schema[schemaItemId];
      if (schemaItem.type === 'relation') {
        collectionsToFetch.add(schemaItem.collection_pointer.id);
      }
    }
  }
  console.log('getting collections', collectionsToFetch);

  if (collectionsToFetch.size > 0) {
    const collectionRecordMap = await notion.fetch<{
      recordMap: ExtendedRecordMap;
    }>({
      endpoint: 'syncRecordValues',
      body: {
        requests: Array.from(collectionsToFetch).map((collectionId) => ({
          table: 'collection',
          id: collectionId,
          version: -1,
        })),
      },
    });
    console.log('collectionRecordMap', collectionRecordMap);
    recordMap = mergeRecordMaps(recordMap, collectionRecordMap.recordMap);
  }

  if (isPreviewImageSupportEnabled) {
    const previewImageMap = await getPreviewImageMap(recordMap);
    (recordMap as any).preview_images = previewImageMap;
  }

  return recordMap;
}

export async function search(params: SearchParams): Promise<SearchResults> {
  return notion.search(params);
}
