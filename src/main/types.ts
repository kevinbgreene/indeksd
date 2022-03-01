import * as ts from 'typescript';
import { Definition } from './parser';

export interface IIndeksdProject {
  type: 'IndeksdProject';

  // Root directory for the project
  rootDir: string;

  // Output directory (relative to root) for generated code
  outDir: string;

  // Source directory (relative to root) for thrift files
  sourceDir: string;

  // Array of parsed source files
  files: Array<IParsedFile>;

  // Options for rendering this project
  options: IMakeOptions;
}

export interface IParsedFile {
  type: 'ParsedFile';

  // Source file that parses to this AST
  sourceFile: ISourceFile;

  // AST for source file content
  body: Array<Definition>;

  // Did error occur while parsing
  errors: boolean;
}

export interface ISourceFile {
  type: 'SourceFile';

  // Name of the source file
  name: string;

  // Absolute path to the directory containing source file
  path: string;

  // Full path to this file
  fullPath: string;

  // The raw source content of this file
  source: string;
}

export interface IGeneratedFile {
  type: 'GeneratedFile';

  // File name
  name: string;

  // File extension
  ext: string;

  // Path to save file
  path: string;

  // Body of file as TS Nodes
  body: Array<ts.Statement>;
}

export interface IMakeOptions {
  // Root to resolve outDir and sourceDir from
  rootDir: string;

  // Where to put generated TypeScript
  outDir: string;

  // Where to find source thrift
  sourceDir: string;

  // Files to generate from
  files: Array<string>;
}
