import * as ts from 'typescript';
const pkg = require('../../package.json');

const eslintDisable: string = ' eslint-disable ';

const prefaceComment: string = `
 * Autogenerated by indeksd v${pkg.version}
 * DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
`;

function generatePreface(req: ts.Statement): void {
  ts.addSyntheticLeadingComment(
    req,
    ts.SyntaxKind.MultiLineCommentTrivia,
    eslintDisable,
    true,
  );

  ts.addSyntheticLeadingComment(
    req,
    ts.SyntaxKind.MultiLineCommentTrivia,
    prefaceComment,
    true,
  );
}

export function print(
  statements: ReadonlyArray<ts.Statement>,
  includePreface: boolean = false,
): string {
  const printer: ts.Printer = ts.createPrinter();
  const rawSourceFile: ts.SourceFile = ts.createSourceFile(
    'schema.ts',
    '',
    ts.ScriptTarget.ES2021,
    false,
    ts.ScriptKind.TS,
  );

  const bodyFile: ts.SourceFile = ts.updateSourceFileNode(
    rawSourceFile,
    statements,
  );

  if (includePreface && statements.length > 0) {
    generatePreface(statements[0]);
  } else {
    console.warn(`Printing empty file`);
  }

  return printer.printBundle(ts.factory.createBundle([bodyFile]));
}
