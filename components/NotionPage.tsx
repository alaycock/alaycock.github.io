import cs from 'classnames';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ExportedImage from 'next-image-export-optimizer';
import { formatDate, getBlockTitle, getPageProperty } from 'notion-utils';
import * as React from 'react';
import BodyClassName from 'react-body-classname';
import { type NotionComponents, NotionRenderer } from 'react-notion-x';
import { useSearchParam } from 'react-use';

import type * as types from '@/lib/types';
import * as config from '@/lib/config';
import { mapImageUrlToLocal } from '@/lib/map-image-url';
import { getCanonicalPageUrl, mapPageUrl } from '@/lib/map-page-url';

import { Footer } from './Footer';
import { Loading } from './Loading';
import { NotionPageHeader } from './NotionPageHeader';
import { Page404 } from './Page404';
import { PageHead } from './PageHead';
import styles from './styles.module.css';

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

const Code = dynamic(() =>
  import('react-notion-x/build/third-party/code').then(async (m) => {
    // add / remove any prism syntaxes here
    await Promise.allSettled([
      import('prismjs/components/prism-markup-templating.js'),
      import('prismjs/components/prism-markup.js'),
      import('prismjs/components/prism-bash.js'),
      import('prismjs/components/prism-c.js'),
      import('prismjs/components/prism-cpp.js'),
      import('prismjs/components/prism-csharp.js'),
      import('prismjs/components/prism-docker.js'),
      import('prismjs/components/prism-java.js'),
      import('prismjs/components/prism-js-templates.js'),
      import('prismjs/components/prism-coffeescript.js'),
      import('prismjs/components/prism-diff.js'),
      import('prismjs/components/prism-git.js'),
      import('prismjs/components/prism-go.js'),
      import('prismjs/components/prism-graphql.js'),
      import('prismjs/components/prism-handlebars.js'),
      import('prismjs/components/prism-less.js'),
      import('prismjs/components/prism-makefile.js'),
      import('prismjs/components/prism-markdown.js'),
      import('prismjs/components/prism-objectivec.js'),
      import('prismjs/components/prism-ocaml.js'),
      import('prismjs/components/prism-python.js'),
      import('prismjs/components/prism-reason.js'),
      import('prismjs/components/prism-rust.js'),
      import('prismjs/components/prism-sass.js'),
      import('prismjs/components/prism-scss.js'),
      import('prismjs/components/prism-solidity.js'),
      import('prismjs/components/prism-sql.js'),
      import('prismjs/components/prism-stylus.js'),
      import('prismjs/components/prism-swift.js'),
      import('prismjs/components/prism-wasm.js'),
      import('prismjs/components/prism-yaml.js'),
    ]);
    return m.Code;
  }),
);

const Collection = dynamic(() =>
  import('react-notion-x/build/third-party/collection').then(
    (m) => m.Collection,
  ),
);
const Equation = dynamic(() =>
  import('react-notion-x/build/third-party/equation').then((m) => m.Equation),
);
const Pdf = dynamic(
  () => import('react-notion-x/build/third-party/pdf').then((m) => m.Pdf),
  {
    ssr: false,
  },
);
const Modal = dynamic(
  () =>
    import('react-notion-x/build/third-party/modal').then((m) => {
      m.Modal.setAppElement('.notion-viewport');
      return m.Modal;
    }),
  {
    ssr: false,
  },
);

function PageLink(props) {
  const router = useRouter();
  const illegalCollectionIds = new Set([
    '9bd3b8a2-7f3e-410b-98bf-8eae46e286f0',
    'adfdd69e-1da8-47b3-be20-69d1fd4a75e0',
  ]);
  let shouldLink = true;
  React.Children.forEach(props.children, (child) => {
    if (
      child?.props?.block?.parent_table === 'collection' &&
      illegalCollectionIds.has(child?.props?.block?.parent_id)
    ) {
      shouldLink = false;
    }
  });
  if (shouldLink) {
    return <a {...props} onClick={() => router.push(props.href)} />;
  }
  return <>{props.children}</>;
}

const propertyLastEditedTimeValue = (
  { block, pageHeader },
  defaultFn: () => React.ReactNode,
) => {
  if (pageHeader && block?.last_edited_time) {
    return `Last updated ${formatDate(block?.last_edited_time, {
      month: 'long',
    })}`;
  }

  return defaultFn();
};

const propertyDateValue = (
  { data, schema, pageHeader },
  defaultFn: () => React.ReactNode,
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'published') {
    const publishDate = data?.[0]?.[1]?.[0]?.[1]?.start_date;

    if (publishDate) {
      return `${formatDate(publishDate, {
        month: 'long',
      })}`;
    }
  }

  return defaultFn();
};

const propertyTextValue = (
  { schema, pageHeader },
  defaultFn: () => React.ReactNode,
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'author') {
    return <b>{defaultFn()}</b>;
  }

  return defaultFn();
};

export function NotionPage({
  site,
  recordMap,
  error,
  pageId,
  pageWidth,
}: types.NotionPageProps) {
  const router = useRouter();
  const lite = useSearchParam('lite');

  const components = React.useMemo<Partial<NotionComponents>>(
    () => ({
      nextImage: ExportedImage,
      nextLink: Link,
      Code,
      Collection,
      Equation,
      PageLink,
      Pdf,
      Modal,
      Header: NotionPageHeader,
      propertyLastEditedTimeValue,
      propertyTextValue,
      propertyDateValue,
    }),
    [],
  );

  // lite mode is for oembed
  const isLiteMode = lite === 'true';

  const siteMapPageUrl = React.useMemo(() => {
    const params: any = {};
    if (lite) params.lite = lite;

    const searchParams = new URLSearchParams(params);
    return mapPageUrl(site, recordMap, searchParams);
  }, [site, recordMap, lite]);

  const keys = Object.keys(recordMap?.block || {});
  const block = recordMap?.block?.[keys[0]]?.value;

  // const isRootPage =
  //   parsePageId(block?.id) === parsePageId(site?.rootNotionPageId)
  const isBlogPost =
    block?.type === 'page' && block?.parent_table === 'collection';

  const showTableOfContents = !!isBlogPost;
  const minTableOfContentsItems = 3;

  const footer = React.useMemo(() => <Footer />, []);

  if (router.isFallback) {
    return <Loading />;
  }

  if (error || !site || !block) {
    return <Page404 site={site} pageId={pageId} error={error} />;
  }

  const title = getBlockTitle(block, recordMap) || site.name;

  console.log('notion page', {
    isDev: config.isDev,
    title,
    pageId,
    rootNotionPageId: site.rootNotionPageId,
  });

  if (!config.isServer) {
    // add important objects to the window global for easy debugging
    const g = window as any;
    g.pageId = pageId;
    g.recordMap = recordMap;
    g.block = block;
  }

  const canonicalPageUrl =
    !config.isDev && getCanonicalPageUrl(site, recordMap)(pageId);

  const socialImage = mapImageUrlToLocal(
    getPageProperty<string>('Social Image', block, recordMap) ||
      (block as types.PageBlock).format?.page_cover ||
      config.defaultPageCover,
    block,
  );

  const socialDescription =
    getPageProperty<string>('Description', block, recordMap) ||
    config.description;

  return (
    <>
      <PageHead
        pageId={pageId}
        site={site}
        title={title}
        description={socialDescription}
        image={socialImage}
        url={canonicalPageUrl}
      />

      {isLiteMode && <BodyClassName className='notion-lite' />}

      <NotionRenderer
        bodyClassName={cs(
          styles.notion,
          pageId === site.rootNotionPageId && 'index-page',
        )}
        darkMode={false}
        components={components}
        recordMap={recordMap}
        rootPageId={site.rootNotionPageId}
        rootDomain={site.domain}
        fullPage={!isLiteMode}
        previewImages={!!recordMap.preview_images}
        pageWidth={pageWidth}
        showTableOfContents={showTableOfContents}
        minTableOfContentsItems={minTableOfContentsItems}
        defaultPageIcon={config.defaultPageIcon}
        defaultPageCover={config.defaultPageCover}
        defaultPageCoverPosition={config.defaultPageCoverPosition}
        mapPageUrl={siteMapPageUrl}
        mapImageUrl={mapImageUrlToLocal}
        searchNotion={null}
        footer={footer}
        linkTableTitleProperties={false}
      />
    </>
  );
}
