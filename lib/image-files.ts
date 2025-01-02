import { normalizeUrl } from 'notion-utils';

import { hash } from './hash';

export const getFilename = (url: string) =>
  `public/images/${hash(normalizeUrl(url))}.jpeg`;

export const getPath = (url: string) =>
  `/images/${hash(normalizeUrl(url))}.jpeg`;
