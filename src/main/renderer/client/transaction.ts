import * as ts from 'typescript';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { createConstStatement } from '../helpers';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { getJoinsForTable, TableJoin } from '../joins';
import { clientClassNameForTable } from './common';

export type TransactionMode = 'readonly' | 'readwrite' | 'versionchange';

export function createTransactionWithMode({
  table,
  database,
  mode,
  withJoins,
}: {
  table: TableDefinition;
  database: DatabaseDefinition;
  mode: TransactionMode;
  withJoins: boolean;
}): ts.Statement {
  const joins = withJoins ? getJoinsForTable(table, database) : [];
  const hasJoins = joins.length > 0;

  return createConstStatement(
    ts.factory.createIdentifier('tx'),
    undefined,
    ts.factory.createBinaryExpression(
      ts.factory.createPropertyAccessChain(
        COMMON_IDENTIFIERS.options,
        ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
        COMMON_IDENTIFIERS.transaction,
      ),
      ts.factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
      hasJoins
        ? createConditionalWithJoinsForTable({ table, joins, mode })
        : createSimpleTransactionForTable({ table, mode }),
    ),
  );
}

function createConditionalWithJoinsForTable({
  table,
  joins,
  mode,
}: {
  table: TableDefinition;
  joins: ReadonlyArray<TableJoin>;
  mode: TransactionMode;
}) {
  return ts.factory.createConditionalExpression(
    ts.factory.createBinaryExpression(
      ts.factory.createPropertyAccessChain(
        COMMON_IDENTIFIERS.options,
        ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
        COMMON_IDENTIFIERS.withJoins,
      ),
      ts.factory.createToken(ts.SyntaxKind.ExclamationEqualsToken),
      ts.factory.createFalse(),
    ),
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.db,
        COMMON_IDENTIFIERS.transaction,
      ),
      undefined,
      [
        ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            COMMON_IDENTIFIERS.Array,
            'from',
          ),
          undefined,
          [
            ts.factory.createNewExpression(COMMON_IDENTIFIERS.Set, undefined, [
              ts.factory.createArrayLiteralExpression([
                ...joins.map((next) => {
                  return tablesForTransaction(next.table);
                }),
                tablesForTransaction(table),
              ]),
            ]),
          ],
        ),
      ],
    ),
    ts.factory.createToken(ts.SyntaxKind.ColonToken),
    createSimpleTransactionForTable({ table, mode }),
  );
}

function createSimpleTransactionForTable({
  table,
  mode,
}: {
  table: TableDefinition;
  mode: TransactionMode;
}): ts.CallExpression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      COMMON_IDENTIFIERS.db,
      COMMON_IDENTIFIERS.transaction,
    ),
    undefined,
    [
      ts.factory.createArrayLiteralExpression([
        ts.factory.createStringLiteral(table.name.value),
      ]),
      ts.factory.createStringLiteral(mode),
    ],
  );
}

function tablesForTransaction(table: TableDefinition): ts.SpreadElement {
  return ts.factory.createSpreadElement(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier(clientClassNameForTable(table)),
      'tablesForTransaction',
    ),
  );
}
