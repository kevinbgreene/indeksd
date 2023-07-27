import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { DatabaseDefinition, Expression, TableDefinition } from '../../parser';
import { capitalize } from '../utils';
import {
  getPrimaryKeyFieldForTable,
  getPrimaryKeyTypeForTable,
  getPrimaryKeyTypeForTableAsString,
} from '../keys';
import { getJoinsForTable, TableJoin } from '../joins';
import { createConstStatement, createNewErrorWithMessage } from '../helpers';
import { getItemTypeForTable } from '../common';
import { createPushMethodCall } from '../observable';
import { createNullType } from '../types';
import { renderExpression } from '../expressions';

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
  requestName: ts.Identifier,
  methodName: 'add' | 'put',
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.Statement {
  const joins = getJoinsForTable(table, database);
  const primaryKeyField = getPrimaryKeyFieldForTable(table);

  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        requestName,
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
                requestName,
                ts.SyntaxKind.ExclamationEqualsToken,
                ts.factory.createNull(),
              ),
              ts.factory.createBlock(
                [
                  createConstStatement(
                    COMMON_IDENTIFIERS.mergedResult,
                    getItemTypeForTable(table),
                    ts.factory.createAsExpression(
                      ts.factory.createObjectLiteralExpression(
                        [
                          ts.factory.createSpreadAssignment(
                            COMMON_IDENTIFIERS.arg,
                          ),
                          ...joins.map((next) => {
                            if (next.required) {
                              return ts.factory.createPropertyAssignment(
                                next.fieldName,
                                identifierForJoinId(next),
                              );
                            } else {
                              return ts.factory.createSpreadAssignment(
                                ts.factory.createConditionalExpression(
                                  ts.factory.createBinaryExpression(
                                    identifierForJoinId(next),
                                    ts.SyntaxKind.EqualsEqualsToken,
                                    ts.factory.createNull(),
                                  ),
                                  undefined,
                                  ts.factory.createObjectLiteralExpression([]),
                                  undefined,
                                  ts.factory.createObjectLiteralExpression([
                                    ts.factory.createPropertyAssignment(
                                      next.fieldName,
                                      identifierForJoinId(next),
                                    ),
                                  ]),
                                ),
                              );
                            }
                          }),
                          ts.factory.createPropertyAssignment(
                            primaryKeyField.name.value,
                            ts.factory.createPropertyAccessExpression(
                              requestName,
                              COMMON_IDENTIFIERS.result,
                            ),
                          ),
                        ],
                        true,
                      ),
                      getItemTypeForTable(table),
                    ),
                  ),
                  createPushMethodCall(
                    methodName,
                    COMMON_IDENTIFIERS.mergedResult,
                  ),
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.resolve,
                      undefined,
                      [COMMON_IDENTIFIERS.mergedResult],
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

type DefaultValue = Readonly<{
  propertyName: string;
  initializer: Expression;
}>;

function getDefaultValueFields(
  table: TableDefinition,
): ReadonlyArray<DefaultValue> {
  const result: Array<DefaultValue> = [];
  for (const field of table.body) {
    if (field.defaultValue != null) {
      result.push({
        propertyName: field.name.value,
        initializer: field.defaultValue,
      });
    }
  }
  return result;
}

export function createAddRequestHandling(
  table: TableDefinition,
  database: DatabaseDefinition,
  methodName: 'put' | 'add',
): ReadonlyArray<ts.Statement> {
  const joins = getJoinsForTable(table, database);
  const fieldsWithDefaultValues = getDefaultValueFields(table);
  const statements: Array<ts.Statement> = [];
  const requestName =
    methodName === 'put'
      ? COMMON_IDENTIFIERS.DBPutRequest
      : COMMON_IDENTIFIERS.DBAddRequest;

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
              ...fieldsWithDefaultValues.map((next) => {
                return ts.factory.createPropertyAssignment(
                  next.propertyName,
                  ts.factory.createConditionalExpression(
                    ts.factory.createBinaryExpression(
                      ts.factory.createPropertyAccessExpression(
                        COMMON_IDENTIFIERS.arg,
                        next.propertyName,
                      ),
                      ts.SyntaxKind.ExclamationEqualsToken,
                      ts.factory.createNull(),
                    ),
                    undefined,
                    ts.factory.createPropertyAccessExpression(
                      COMMON_IDENTIFIERS.arg,
                      next.propertyName,
                    ),
                    undefined,
                    renderExpression(next.initializer),
                  ),
                );
              }),
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
    createOnSuccessHandler(requestName, methodName, table, database),
  );

  return statements;
}

export function createJoinHandling(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  const joins: ReadonlyArray<TableJoin> = getJoinsForTable(table, database);
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
    ...joins.flatMap((join) => {
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

function createNullHandlingForTableJoin(
  join: TableJoin,
): ReadonlyArray<ts.Statement> {
  if (join.required === false) {
    return [];
  }

  return [
    ts.factory.createIfStatement(
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
    ),
  ];
}

function createHandlingForTableJoin(join: TableJoin): ts.Expression {
  return ts.factory.createNewExpression(
    COMMON_IDENTIFIERS.Promise,
    [
      ts.factory.createUnionTypeNode([
        getPrimaryKeyTypeForTable(join.table),
        createNullType(),
      ]),
    ],
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
                ts.factory.createPropertyAccessExpression(
                  COMMON_IDENTIFIERS.arg,
                  join.fieldName,
                ),
                ts.SyntaxKind.EqualsEqualsToken,
                ts.factory.createNull(),
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.resolve,
                      undefined,
                      [ts.factory.createNull()],
                    ),
                  ),
                ],
                true,
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
            ),
          ],
          true,
        ),
      ),
    ],
  );
}

export function createDefaultClauseForIndexHandling(
  method: 'reject' | 'throw',
): ts.DefaultClause {
  return ts.factory.createDefaultClause([
    ts.factory.createBlock(
      [
        method === 'throw'
          ? ts.factory.createThrowStatement(
              createNewErrorWithMessage(
                ts.factory.createBinaryExpression(
                  ts.factory.createStringLiteral(
                    'Trying to run query on unknown index: ',
                  ),
                  ts.SyntaxKind.PlusToken,
                  COMMON_IDENTIFIERS.indexName,
                ),
              ),
            )
          : ts.factory.createReturnStatement(
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
