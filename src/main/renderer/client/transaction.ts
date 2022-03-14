import * as ts from 'typescript';
import { createConstStatement } from '../helpers';

export type TransactionMode = 'readonly' | 'readwrite' | 'versionchange';

export function createTransactionWithMode(
  table: string,
  mode: TransactionMode,
): ts.Statement {
  return createConstStatement(
    ts.factory.createIdentifier('tx'),
    undefined,
    ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier('db'),
        ts.factory.createIdentifier('transaction'),
      ),
      undefined,
      [
        ts.factory.createArrayLiteralExpression([
          ts.factory.createStringLiteral(table),
        ]),
        ts.factory.createStringLiteral(mode),
      ],
    ),
  );
}
