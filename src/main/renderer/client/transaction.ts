import * as ts from 'typescript';
import { createConstStatement } from '../helpers';
import { COMMON_IDENTIFIERS } from '../identifiers';

export type TransactionMode = 'readonly' | 'readwrite' | 'versionchange';

export function createTransactionWithMode(
  table: string,
  mode: TransactionMode,
): ts.Statement {
  return createConstStatement(
    ts.factory.createIdentifier('tx'),
    undefined,
    ts.factory.createBinaryExpression(
      ts.factory.createPropertyAccessChain(
        ts.factory.createIdentifier('options'),
        ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
        ts.factory.createIdentifier('transaction'),
      ),
      ts.factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.db,
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
    ),
  );
}
