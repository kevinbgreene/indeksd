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
import { createConstStatement, createNewErrorWithMessage } from '../helpers';

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
                        createNewErrorWithMessage(
                          'Unknown error occurred trying to perform operation',
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
                                COMMON_IDENTIFIERS.result,
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
                        createNewErrorWithMessage(
                          'Operation produced a null result',
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
  // const statements = joins.flatMap((next) => createHandlingForTableJoin(next));
  const statements: Array<ts.Statement> = [
    ts.factory.createVariableStatement(
      undefined,
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createArrayBindingPattern(
              joins.map((join) => {
                return ts.factory.createBindingElement(
                  undefined,
                  undefined,
                  identifierForJoinId(join),
                  undefined,
                );
              }),
            ),
            undefined,
            undefined,
            ts.factory.createAwaitExpression(
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  COMMON_IDENTIFIERS.Promise,
                  COMMON_IDENTIFIERS.all,
                ),
                undefined,
                [
                  ts.factory.createArrayLiteralExpression(
                    joins.map((join) => {
                      return createHandlingForTableJoin(join);
                    }),
                    true,
                  ),
                ],
              ),
            ),
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
    ...joins.map((join) => {
      return createNullHandlingForTableJoin(join);
    }),
  ];
  return statements;
}

export function identifierForJoinId(join: TableJoin): ts.Identifier {
  return ts.factory.createIdentifier(
    `${join.table.name.value.toLowerCase()}Id`,
  );
}

function createNullHandlingForTableJoin(join: TableJoin): ts.Statement {
  return ts.factory.createIfStatement(
    ts.factory.createBinaryExpression(
      identifierForJoinId(join),
      ts.SyntaxKind.EqualsEqualsToken,
      ts.factory.createNull(),
    ),
    ts.factory.createBlock(
      [
        ts.factory.createExpressionStatement(
          ts.factory.createCallExpression(
            COMMON_IDENTIFIERS.reject,
            undefined,
            [
              createNewErrorWithMessage(
                `Unknown error occurred while trying to join table: ${join.table.name.value}`,
              ),
            ],
          ),
        ),
        ts.factory.createReturnStatement(undefined),
      ],
      true,
    ),
  );
}

function createHandlingForTableJoin(join: TableJoin): ts.Expression {
  return ts.factory.createNewExpression(
    COMMON_IDENTIFIERS.Promise,
    [getPrimaryKeyTypeForTable(join.table)],
    [
      ts.factory.createArrowFunction(
        [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)],
        undefined,
        [
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            COMMON_IDENTIFIERS.resolve,
            undefined,
            undefined,
            undefined,
          ),
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            COMMON_IDENTIFIERS.reject,
            undefined,
            undefined,
            undefined,
          ),
        ],
        undefined,
        undefined,
        ts.factory.createBlock(
          [
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
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.resolve,
                      undefined,
                      [
                        ts.factory.createPropertyAccessExpression(
                          COMMON_IDENTIFIERS.arg,
                          join.fieldName,
                        ),
                      ],
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
                                COMMON_IDENTIFIERS.put,
                              ),
                              undefined,
                              [
                                ts.factory.createPropertyAccessExpression(
                                  COMMON_IDENTIFIERS.arg,
                                  join.fieldName,
                                ),
                                ts.factory.createObjectLiteralExpression([
                                  ts.factory.createPropertyAssignment(
                                    COMMON_IDENTIFIERS.transaction,
                                    COMMON_IDENTIFIERS.tx,
                                  ),
                                ]),
                              ],
                            ),
                          ),
                        ),
                        ts.factory.createExpressionStatement(
                          ts.factory.createCallExpression(
                            COMMON_IDENTIFIERS.resolve,
                            undefined,
                            [
                              ts.factory.createPropertyAccessExpression(
                                ts.factory.createIdentifier(join.fieldName),
                                getPrimaryKeyFieldForTable(join.table).name
                                  .value,
                              ),
                            ],
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
                        [
                          ts.factory.createExpressionStatement(
                            ts.factory.createCallExpression(
                              COMMON_IDENTIFIERS.reject,
                              undefined,
                              [COMMON_IDENTIFIERS.error],
                            ),
                          ),
                        ],
                        true,
                      ),
                    ),
                    undefined,
                  ),
                ],
                true,
              ),
            ),
          ],
          true,
        ),
      ),
    ],
  );
}

export function createDefaultClauseForIndexHandling(): ts.DefaultClause {
  return ts.factory.createDefaultClause([
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              COMMON_IDENTIFIERS.Promise,
              COMMON_IDENTIFIERS.reject,
            ),
            undefined,
            [
              createNewErrorWithMessage(
                ts.factory.createBinaryExpression(
                  ts.factory.createStringLiteral(
                    'Trying to run query on unknown index: ',
                  ),
                  ts.SyntaxKind.PlusToken,
                  COMMON_IDENTIFIERS.indexName,
                ),
              ),
            ],
          ),
        ),
      ],
      true,
    ),
  ]);
}
