import { type Block, type ExtendedRecordMap } from 'notion-types';

import { PageSocial } from './PageSocial';

export function PageAside({
  block,
}: {
  block: Block;
  recordMap: ExtendedRecordMap;
  isBlogPost: boolean;
}) {
  if (!block) {
    return null;
  }

  return <PageSocial />;
}
