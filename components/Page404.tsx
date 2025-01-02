import type * as types from '@/lib/types';

import { PageHead } from './PageHead';
import styles from './styles.module.css';

export function Page404({ site }: types.PageProps) {
  const title = 'Page Not Found';

  return (
    <>
      <PageHead site={site} title={title} />

      <div className={styles.container}>
        <main className={styles.main}>
          <h1>Page Not Found</h1>

          <img
            src='/404.png'
            alt='404 Not Found'
            className={styles.errorImage}
          />
        </main>
      </div>
    </>
  );
}
