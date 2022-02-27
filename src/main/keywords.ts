import { Keyword } from './parser/types';

export type KeywordMap = Readonly<{
  [name: string]: Keyword;
}>;

export const KEYWORDS: KeywordMap = Object.freeze({
  database: 'DatabaseKeyword',
  table: 'TableKeyword',
  type: 'TypeKeyword',
  true: 'TrueKeyword',
  false: 'FalseKeyword',
});
