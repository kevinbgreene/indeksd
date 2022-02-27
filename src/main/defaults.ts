import { IMakeOptions } from './types';
import { deepMerge } from './utils';

export const DEFAULT_APACHE_LIB = 'thrift';

export const DEFAULT_THRIFT_SERVER_LIB = '@creditkarma/thrift-server-core';

export const DEFAULT_OPTIONS: IMakeOptions = {
  rootDir: '.',
  outDir: './codegen',
  sourceDir: './thrift',
  files: [],
};

export function mergeWithDefaults(
  options: Partial<IMakeOptions>,
): IMakeOptions {
  return deepMerge(DEFAULT_OPTIONS, options);
}
