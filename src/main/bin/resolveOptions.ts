import { lstatSync } from 'fs';

import { DEFAULT_OPTIONS } from '../options';
import { IMakeOptions } from '../types';
import { deepCopy } from '../utils';

/**
 * Options:
 *
 * --rootDir
 * --outDir
 * --sourceDir
 */
export function resolveOptions(args: Array<string>): IMakeOptions {
  const len: number = args.length;
  let index: number = 0;
  const options: IMakeOptions = deepCopy(DEFAULT_OPTIONS);
  const files: Array<string> = [];

  while (index < len) {
    const next: string = args[index];

    switch (next) {
      case '--rootDir':
        options.rootDir = args[index + 1];
        try {
          if (lstatSync(options.rootDir).isDirectory()) {
            index += 2;
            break;
          } else {
            throw new Error(
              `Provided root directory "${options.rootDir}" isn't a directory`,
            );
          }
        } catch (e) {
          throw new Error(
            `Provided root directory "${options.rootDir}" doesn't exist`,
          );
        }

      case '--sourceDir':
        options.sourceDir = args[index + 1];
        index += 2;
        break;

      case '--outDir':
        options.outDir = args[index + 1];
        index += 2;
        break;

      default:
        if (next.startsWith('--')) {
          throw new Error(`Unknown option provided to generator "${next}"`);
        } else {
          // Assume option is a file to render
          files.push(next);
          index += 1;
        }
    }
  }

  return {
    ...options,
    files,
  };
}
