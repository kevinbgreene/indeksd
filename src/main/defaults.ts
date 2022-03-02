import { IMakeOptions } from './types';
import { deepMerge } from './utils';

export const DEFAULT_OPTIONS: IMakeOptions = {
  rootDir: '.',
  outDir: './codegen',
  sourceDir: './indeksd',
  files: [],
};

export function mergeWithDefaults(
  options: Partial<IMakeOptions>,
): IMakeOptions {
  return deepMerge(DEFAULT_OPTIONS, options);
}
