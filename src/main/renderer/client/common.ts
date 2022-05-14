import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { capitalize } from '../utils';
import {
  getPrimaryKeyFieldForTable,
  getPrimaryKeyTypeForTable,
  getPrimaryKeyTypeForTableAsString,
} from '../keys';
import { getJoinsForTable, TableJoin } from '../joins';
import { createConstStatement, createLetStatement } from '../helpers';

export function clientTypeNameForTable(def: TableDefinition): string {
  return `${capitalize(def.name.value)}Client`;
}

export function clientClassNameForTable(def: TableDefinition): string {
  return `${capitalize(def.name.value)}ClientImpl`;
}

export function clientVariableNameForTable(def: TableDefinition): string {
  return `${def.name.value.toLowerCase()}Client`;
}

export function createDatabaseClientName(def: DatabaseDefinition): string {
  return `${capitalize(def.name.value)}Client`;
}

export function createClientTypeNode(def: DatabaseDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(createDatabaseClientName(def));
}

export function createOnErrorHandler(methodName: ts.Identifier): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        methodName,
        COMMON_IDENTIFIERS.onerror,
      ),
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [], // params
        undefined,
        undefined,
        ts.factory.createBlock(
          [
            ts.factory.createIfStatement(
              ts.factory.createBinaryExpression(
                methodName,
                ts.SyntaxKind.ExclamationEqualsToken,
                ts.factory.createNull(),
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.reject,
                      undefined,
                      [
                        ts.factory.createPropertyAccessExpression(
                          methodName,
                          'error',
                        ),
                      ],
                    ),
                  ),
                ],
                true,
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.reject,
                      undefined,
                      [
                        ts.factory.createNewExpression(
                          COMMON_IDENTIFIERS.Error,
                          undefined,
                          [
                            ts.factory.createStringLiteral(
                              'Unknown error occurred trying to perform operation',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
                true,
              ),
            ),
          ],
          true,
        ),
      ),
    ),
  );
}

export function createOnSuccessHandler(
  methodName: ts.Identifier,
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.Statement {
  const joins = getJoinsForTable(table, database);
  const primaryKeyField = getPrimaryKeyFieldForTable(table);

  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        methodName,
        COMMON_IDENTIFIERS.onsuccess,
      ),
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [], // params
        undefined,
        undefined,
        ts.factory.createBlock(
          [
            ts.factory.createIfStatement(
              ts.factory.createBinaryExpression(
                methodName,
                ts.SyntaxKind.ExclamationEqualsToken,
                ts.factory.createNull(),
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.resolve,
                      undefined,
                      [
                        ts.factory.createObjectLiteralExpression(
                          [
                            ts.factory.createSpreadAssignment(
                              COMMON_IDENTIFIERS.arg,
                            ),
                            ...joins.map((next) => {
                              return ts.factory.createPropertyAssignment(
                                next.fieldName,
                                identifierForJoinId(next),
                              );
                            }),
                            ts.factory.createPropertyAssignment(
                              primaryKeyField.name.value,
                              ts.factory.createPropertyAccessExpression(
                                methodName,
                                'result',
                              ),
                            ),
                          ],
                          true,
                        ),
                      ],
                    ),
                  ),
                ],
                true,
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.reject,
                      undefined,
                      [
                        ts.factory.createNewExpression(
                          COMMON_IDENTIFIERS.Error,
                          undefined,
                          [
                            ts.factory.createStringLiteral(
                              'Operation produced a null result',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
                true,
              ),
            ),
          ],
          true,
        ),
      ),
    ),
  );
}

export function createAddRequestHandling(
  table: TableDefinition,
  database: DatabaseDefinition,
  method: 'put' | 'add',
): ReadonlyArray<ts.Statement> {
  const joins = getJoinsForTable(table, database);
  const statements: Array<ts.Statement> = [];
  const requestName =
    method === 'put'
      ? COMMON_IDENTIFIERS.DBPutRequest
      : COMMON_IDENTIFIERS.DBAddRequest;
  const methodName =
    method === 'put' ? COMMON_IDENTIFIERS.put : COMMON_IDENTIFIERS.add;

  statements.push(
    createConstStatement(
      requestName,
      ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBRequest),
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.store,
          methodName,
        ),
        undefined,
        [
          ts.factory.createObjectLiteralExpression(
            [
              ts.factory.createSpreadAssignment(COMMON_IDENTIFIERS.arg),
              ...joins.map((next) => {
                return ts.factory.createPropertyAssignment(
                  next.fieldName,
                  identifierForJoinId(next),
                );
              }),
            ],
            true,
          ),
        ],
      ),
    ),
  );

  statements.push(
    createOnErrorHandler(requestName),
    createOnSuccessHandler(requestName, table, database),
  );

  return statements;
}

export function createJoinHandling(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  const joins: ReadonlyArray<TableJoin> = getJoinsForTable(table, database);
  const statements = joins.flatMap((next) => createHandlingForTableJoin(next));
  return statements;
}

export function identifierForJoinId(join: TableJoin): ts.Identifier {
  return ts.factory.createIdentifier(
    `${join.table.name.value.toLowerCase()}Id`,
  );
}

function createHandlingForTableJoin(
  join: TableJoin,
): ReadonlyArray<ts.Statement> {
  return [
    createLetStatement(
      identifierForJoinId(join),
      getPrimaryKeyTypeForTable(join.table),
      undefined,
    ),
    ts.factory.createIfStatement(
      ts.factory.createBinaryExpression(
        ts.factory.createTypeOfExpression(
          ts.factory.createPropertyAccessExpression(
            COMMON_IDENTIFIERS.arg,
            join.fieldName,
          ),
        ),
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.factory.createStringLiteral(
          getPrimaryKeyTypeForTableAsString(join.table),
        ),
      ),
      ts.factory.createBlock(
        [
          ts.factory.createExpressionStatement(
            ts.factory.createAssignment(
              identifierForJoinId(join),
              ts.factory.createPropertyAccessExpression(
                COMMON_IDENTIFIERS.arg,
                join.fieldName,
              ),
            ),
          ),
        ],
        true,
      ),
      ts.factory.createBlock(
        [
          ts.factory.createTryStatement(
            ts.factory.createBlock(
              [
                createConstStatement(
                  ts.factory.createIdentifier(join.fieldName),
                  undefined,
                  ts.factory.createAwaitExpression(
                    ts.factory.createCallExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createIdentifier(
                          clientVariableNameForTable(join.table),
                        ),
                        'put',
                      ),
                      undefined,
                      [
                        ts.factory.createPropertyAccessExpression(
                          COMMON_IDENTIFIERS.arg,
                          join.fieldName,
                        ),
                      ],
                    ),
                  ),
                ),
                ts.factory.createExpressionStatement(
                  ts.factory.createAssignment(
                    identifierForJoinId(join),
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createIdentifier(join.fieldName),
                      getPrimaryKeyFieldForTable(join.table).name.value,
                    ),
                  ),
                ),
              ],
              true,
            ),
            ts.factory.createCatchClause(
              ts.factory.createVariableDeclaration(
                COMMON_IDENTIFIERS.error,
                undefined,
                undefined,
                undefined,
              ),
              ts.factory.createBlock(
                [ts.factory.createReturnStatement(undefined)],
                true,
              ),
            ),
            undefined,
          ),
        ],
        true,
      ),
    ),
    ts.factory.createIfStatement(
      ts.factory.createBinaryExpression(
        identifierForJoinId(join),
        ts.SyntaxKind.EqualsEqualsToken,
        ts.factory.createNull(),
      ),
      ts.factory.createBlock(
        [ts.factory.createReturnStatement(undefined)],
        true,
      ),
    ),
  ];
}
