import * as path from 'node:path';
import { mergeWithDefaults } from './defaults';
import {
  IDbProject,
  IGeneratedFile,
  IMakeOptions,
  IParsedFile,
  ISourceFile,
} from './types';
import { Definition, Parser } from './parser';
import { readSourceFile } from './reader';
import { collectSourceFiles } from './utils';
import { generateProject } from './generator';
import { saveFiles } from './sys';
import { processDefinitions } from './generator/iterator';
import { print } from './printer';

export interface ParseOptions {
  rootDir: string;
  outDir: string;
  files: Array<string>;
}

export const defaultOptions: ParseOptions = {
  rootDir: '.',
  outDir: '.',
  files: [],
};

export function make(
  source: string,
  options: Partial<IMakeOptions> = {},
): string {
  const mergedOptions: IMakeOptions = mergeWithDefaults(options);

  const sourceFile: ISourceFile = {
    type: 'SourceFile',
    name: 'source.thrift',
    path: '',
    fullPath: '',
    source,
  };

  const project: IDbProject = projectFromSourceFiles(
    [sourceFile],
    mergedOptions,
  );

  const defs: Array<Definition> = project.files[0].body;

  return print(processDefinitions(defs));
}

export async function readProjectFiles(options: {
  rootDir: string;
  sourceDir: string;
  files?: Array<string>;
}): Promise<Array<ISourceFile>> {
  // Root at which we operate relative to
  const rootDir: string = path.resolve(process.cwd(), options.rootDir);

  // Where do we read source files
  const sourceDir: string = path.resolve(rootDir, options.sourceDir);

  const fileNames: Array<string> = collectSourceFiles(sourceDir, options.files);

  const thriftFiles: Array<ISourceFile> = await Promise.all(
    fileNames.map((next: string) => {
      return readSourceFile(next, [sourceDir]);
    }),
  );

  return thriftFiles;
}

export function projectFromSourceFiles(
  sourceFiles: Array<ISourceFile>,
  options: Partial<IMakeOptions> = {},
): IDbProject {
  const mergedOptions: IMakeOptions = mergeWithDefaults(options);

  // Root at which we operate relative to
  const rootDir: string = path.resolve(process.cwd(), mergedOptions.rootDir);

  // Where do we save generated files
  const outDir: string = path.resolve(rootDir, mergedOptions.outDir);

  // Where do we read source files
  const sourceDir: string = path.resolve(rootDir, mergedOptions.sourceDir);

  const parsedFiles: Array<IParsedFile> = sourceFiles.map((next: ISourceFile) =>
    Parser.parseSchemaFile(next),
  );

  return {
    type: 'DbProject',
    rootDir,
    outDir,
    sourceDir,
    files: parsedFiles,
    options: mergedOptions,
  };
}

export async function processProject(
  options: Partial<IMakeOptions> = {},
): Promise<IDbProject> {
  const mergedOptions: IMakeOptions = mergeWithDefaults(options);

  // Root at which we operate relative to
  const rootDir: string = path.resolve(process.cwd(), mergedOptions.rootDir);

  // Where do we read source files
  const sourceDir: string = path.resolve(rootDir, mergedOptions.sourceDir);

  const sourceFiles: Array<ISourceFile> = await readProjectFiles({
    rootDir,
    sourceDir,
    files: mergedOptions.files,
  });

  return projectFromSourceFiles(sourceFiles, mergedOptions);
}

export async function generate(
  options: Partial<IMakeOptions> = {},
): Promise<void> {
  const project: IDbProject = await processProject(options);

  const generatedFiles: Array<IGeneratedFile> = generateProject(project);

  saveFiles(generatedFiles, project.outDir);
}
