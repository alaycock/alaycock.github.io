import { type ExtendedRecordMap, type PageMap } from 'notion-types';
import { parsePageId } from 'notion-utils';
import PQueue from 'p-queue';

/**
 * Cloned from notion-utils, but modified to ignore the "adventures" collection.
 */
export async function getAllPagesInSpace(
  rootPageId: string,
  rootSpaceId: string | undefined,
  getPage: (pageId: string) => Promise<ExtendedRecordMap>,
  {
    concurrency = 4,
    traverseCollections = true,
    targetPageId,
  }: {
    concurrency?: number;
    traverseCollections?: boolean;
    targetPageId?: string;
  } = {},
): Promise<PageMap> {
  const pages: PageMap = {};
  const pendingPageIds = new Set<string>();
  const queue = new PQueue({ concurrency });

  async function processPage(pageId: string) {
    if (targetPageId && pendingPageIds.has(targetPageId)) {
      return;
    }

    pageId = parsePageId(pageId) as string;

    if (pageId && !pages[pageId] && !pendingPageIds.has(pageId)) {
      pendingPageIds.add(pageId);

      queue.add(async () => {
        try {
          if (
            targetPageId &&
            pendingPageIds.has(targetPageId) &&
            pageId !== targetPageId
          ) {
            return;
          }

          const page = await getPage(pageId);
          if (!page) {
            return;
          }

          const spaceId = page.block[pageId]?.value?.space_id;

          if (spaceId) {
            if (!rootSpaceId) {
              rootSpaceId = spaceId;
            } else if (rootSpaceId !== spaceId) {
              return;
            }
          }

          for (const subPageId of Object.keys(page.block).filter((key) => {
            const block = page.block[key]?.value;
            if (!block || block.alive === false) return false;

            if (
              block.type !== 'page' &&
              block.type !== 'collection_view_page'
            ) {
              return false;
            }

            // Don't index the "adventures" collection
            if (block.parent_id === '9bd3b8a2-7f3e-410b-98bf-8eae46e286f0') {
              return false;
            }

            // the space id check is important to limit traversal because pages
            // can reference pages in other spaces
            if (
              rootSpaceId &&
              block.space_id &&
              block.space_id !== rootSpaceId
            ) {
              return false;
            }

            return true;
          }))
            processPage(subPageId);

          // traverse collection item pages as they may contain subpages as well
          if (traverseCollections) {
            for (const collectionViews of Object.values(
              page.collection_query,
            )) {
              for (const collectionData of Object.values(collectionViews)) {
                const { blockIds } = collectionData;

                if (blockIds) {
                  for (const collectionItemId of blockIds) {
                    processPage(collectionItemId);
                  }
                }
              }
            }
          }

          pages[pageId] = page;
        } catch (err: any) {
          console.warn(
            'page load error',
            { pageId, spaceId: rootSpaceId },
            err.statusCode,
            err.message,
          );
          pages[pageId] = null;
        }

        pendingPageIds.delete(pageId);
      });
    }
  }

  await processPage(rootPageId);
  await queue.onIdle();

  return pages;
}
