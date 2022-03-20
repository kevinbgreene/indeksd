import { IMakeOptions } from './types';
import { deepMerge } from './utils';

export const DEFAULT_OPTIONS: Readonly<IMakeOptions> = Object.freeze({
  rootDir: '.',
  outDir: './codegen',
  sourceDir: './schemas',
  files: [],
});

export function mergeWithDefaults(
  options: Partial<IMakeOptions>,
): IMakeOptions {
  return deepMerge(DEFAULT_OPTIONS, options);
}
