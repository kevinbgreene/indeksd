import { IParsedFile, ISourceFile } from '../types';
import { createParser } from './parser';
import { createScanner } from './scanner';
import { DatabaseSchema } from './types';

export * from './types';

function parse(source: string): DatabaseSchema {
  const scanner = createScanner(source);
  const tokens = scanner.scan();

  const parser = createParser(tokens);
  const schema = parser.parse();

  return schema;
}

function parseSchemaString(source: string): DatabaseSchema {
  const schema: DatabaseSchema = parse(source);
  switch (schema.type) {
    case 'DatabaseSchema':
      return schema;

    default:
      throw new Error('Unable to parse source: ');
  }
}

function parseSchemaFromSource(
  source: string,
  fallbackNamespace: string,
): IParsedFile {
  const sourceFile: ISourceFile = {
    type: 'SourceFile',
    name: '',
    path: '',
    fullPath: '',
    source,
  };

  return parseSchemaFile(sourceFile);
}

function parseSchemaFile(file: ISourceFile): IParsedFile {
  const schema: DatabaseSchema = parseSchemaString(file.source);

  return {
    type: 'ParsedFile',
    sourceFile: file,
    body: schema.body,
    errors: false,
  };
}

export const Parser = {
  parseSchemaFromSource,
  parseSchemaString,
  parseSchemaFile,
};
