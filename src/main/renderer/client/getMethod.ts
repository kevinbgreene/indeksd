import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import {
  DatabaseDefinition,
  FieldDefinition,
  TableDefinition,
} from '../../parser';
import {
  createConstStatement,
  createLetStatement,
  createNewErrorWithMessage,
  createNewPromiseWithBody,
} from '../helpers';
import { getIndexesForTableAsArray, isPrimaryKey, TableIndex } from '../keys';
import { createNullType, typeForTypeNode } from '../types';
import { capitalize } from '../utils';
import { clientVariableNameForTable, createOnErrorHandler } from './common';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { AvailableOptions, createOptionsParameterDeclaration } from './type';
import {
  getItemNameWithJoinsForTable,
  getJoinsForTable,
  TableJoin,
  typeNodeResolvingPrimaryKeys,
} from '../joins';
import { getItemNameForTable, getItemTypeForTable } from '../common';

export type GetMethodName = 'get' | 'getAll';

export function createGetArgsTypeName(table: TableDefinition): string {
  return `${capitalize(table.name.value)}GetArgs`;
}

export function typeReferenceForGetMethodByTable(
  table: TableDefinition,
): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(createGetArgsTypeName(table));
}

export function createGetArgsTypeNode(table: TableDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(createGetArgsTypeName(table));
}

function createItemTypeNodeForTable({
  table,
  asArray,
  withJoins,
}: {
  table: TableDefinition;
  asArray: boolean;
  withJoins: boolean;
}): ts.TypeNode {
  if (withJoins) {
    return createItemTypeNodeWithJoinsForTable({ table, asArray });
  } else {
    return createItemTypeNodeWithoutJoinsForTable({ table, asArray });
  }
}

function createItemTypeNodeWithoutJoinsForTable({
  table,
  asArray,
}: {
  table: TableDefinition;
  asArray: boolean;
}): ts.TypeNode {
  const baseType = getItemTypeForTable(table);

  if (asArray) {
    return ts.factory.createTypeReferenceNode(
      COMMON_IDENTIFIERS.ReadonlyArray,
      [baseType],
    );
  } else {
    return baseType;
  }
}

function createItemTypeNodeWithJoinsForTable({
  table,
  asArray,
}: {
  table: TableDefinition;
  asArray: boolean;
}): ts.TypeNode {
  const baseType = ts.factory.createTypeReferenceNode(
    getItemNameWithJoinsForTable(table),
  );

  if (asArray) {
    return ts.factory.createTypeReferenceNode(
      COMMON_IDENTIFIERS.ReadonlyArray,
      [baseType],
    );
  } else {
    return baseType;
  }
}

function createGetMethodSignatureForTable({
  table,
  withJoins,
}: {
  table: TableDefinition;
  withJoins: WithJoins;
}): ts.MethodSignature {
  return ts.factory.createMethodSignature(
    undefined,
    COMMON_IDENTIFIERS.get,
    undefined,
    undefined,
    [
      createArgParamDeclaration(true, typeReferenceForGetMethodByTable(table)),
      createOptionsParamForGetMethod({ withJoins, withCount: false }),
    ],
    createGetMethodReturnTypeForTable({
      table,
      asUnion: withJoins === 'default',
      withJoins: withJoins === 'true' || withJoins === 'default',
      asArray: false,
    }),
  );
}

export function createGetMethodSignaturesForTable(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.MethodSignature> {
  const joins = getJoinsForTable(table, database);

  if (joins.length > 0) {
    return [
      createGetMethodSignatureForTable({ table, withJoins: 'true' }),
      createGetMethodSignatureForTable({ table, withJoins: 'false' }),
      createGetMethodSignatureForTable({ table, withJoins: 'default' }),
    ];
  } else {
    return [createGetMethodSignatureForTable({ table, withJoins: 'none' })];
  }
}

export type WithJoins = 'true' | 'false' | 'none' | 'default';

export function createOptionsParamForGetMethod({
  withJoins,
  withCount,
}: {
  withJoins: WithJoins;
  withCount: boolean;
}): ts.ParameterDeclaration {
  const includes: Array<AvailableOptions> = ['transaction'];

  switch (withJoins) {
    case 'true':
      includes.push('with_joins_true');
      break;
    case 'false':
      includes.push('with_joins_false');
      break;
    case 'none':
      break;
    default:
      includes.push('with_joins_default');
      break;
  }

  if (withCount) {
    includes.push('count');
  }

  return createOptionsParameterDeclaration({
    optional: withJoins != 'false',
    includes,
  });
}

export function createArgParamDeclaration(
  isRequired: boolean,
  typeNode: ts.TypeNode,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.arg,
    isRequired
      ? undefined
      : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    typeNode,
  );
}

export function createGetMethodBaseReturnTypeForTable({
  table,
  asUnion,
  withJoins,
  asArray,
}: {
  table: TableDefinition;
  asUnion: boolean;
  withJoins: boolean;
  asArray: boolean;
}): ts.TypeNode {
  if (asUnion) {
    return ts.factory.createUnionTypeNode([
      createItemTypeNodeWithoutJoinsForTable({ table, asArray }),
      createItemTypeNodeWithJoinsForTable({ table, asArray }),
    ]);
  }

  return createItemTypeNodeForTable({ table, asArray, withJoins });
}

export function createGetMethodReturnTypeForTable(args: {
  table: TableDefinition;
  asUnion: boolean;
  withJoins: boolean;
  asArray: boolean;
}): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
    createGetMethodBaseReturnTypeForTable(args),
  ]);
}

function createGetMethodDeclaration({
  table,
  withJoins,
  methodBody,
}: {
  table: TableDefinition;
  withJoins: WithJoins;
  methodBody?: ts.Block;
}): ts.MethodDeclaration {
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.get,
    undefined,
    undefined,
    [
      createArgParamDeclaration(true, typeReferenceForGetMethodByTable(table)),
      createOptionsParamForGetMethod({ withJoins, withCount: false }),
    ],
    createGetMethodReturnTypeForTable({
      table,
      asUnion: withJoins === 'default',
      withJoins: withJoins === 'true' || withJoins === 'default',
      asArray: false,
    }),
    methodBody,
  );
}

export function createGetMethodDeclarations({
  table,
  database,
  methodBody,
}: {
  table: TableDefinition;
  database: DatabaseDefinition;
  methodBody: ts.Block;
}): ReadonlyArray<ts.MethodDeclaration> {
  const joins = getJoinsForTable(table, database);

  if (joins.length > 0) {
    return [
      createGetMethodDeclaration({
        table,
        withJoins: 'true',
      }),
      createGetMethodDeclaration({
        table,
        withJoins: 'false',
      }),
      createGetMethodDeclaration({
        table,
        withJoins: 'default',
        methodBody,
      }),
    ];
  } else {
    return [
      createGetMethodDeclaration({
        table,
        withJoins: 'none',
        methodBody,
      }),
    ];
  }
}

export function createGetMethod(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.MethodDeclaration> {
  return createGetMethodDeclarations({
    table,
    database,
    methodBody: ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          createNewPromiseWithBody(
            undefined,
            undefined,
            ts.factory.createBlock(
              [
                createTransactionWithMode({
                  table,
                  database,
                  mode: 'readonly',
                  withJoins: true,
                }),
                createGetObjectStore(table.name.value),
                ...createIndexNarrowing(table, database),
              ],
              true,
            ),
          ),
        ),
      ],
      true,
    ),
  });
}

export function createHandlingForGetByIndex({
  tableIndex,
  methodName,
  argumentsArray,
}: {
  tableIndex: TableIndex;
  methodName: GetMethodName;
  argumentsArray: ReadonlyArray<ts.Expression>;
}): ReadonlyArray<ts.Statement> {
  return [
    createConstStatement(
      COMMON_IDENTIFIERS.index,
      ts.factory.createTypeReferenceNode(
        COMMON_IDENTIFIERS.IDBIndex,
        undefined,
      ),
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.store,
          COMMON_IDENTIFIERS.index,
        ),
        undefined,
        [ts.factory.createStringLiteral(tableIndex.name)],
      ),
    ),
    ts.factory.createExpressionStatement(
      ts.factory.createAssignment(
        COMMON_IDENTIFIERS.DBGetRequest,
        ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            COMMON_IDENTIFIERS.index,
            ts.factory.createIdentifier(methodName),
          ),
          undefined,
          argumentsArray,
        ),
      ),
    ),
  ];
}

function createHandlingForIndexGet({
  table,
  tableIndex,
  methodName,
  remaining,
  keys,
}: {
  table: TableDefinition;
  tableIndex: TableIndex;
  methodName: GetMethodName;
  remaining: ReadonlyArray<TableIndex>;
  keys: ReadonlyArray<TableIndex>;
}): ts.IfStatement {
  return ts.factory.createIfStatement(
    ts.factory.createCallExpression(
      ts.factory.createIdentifier(
        createPredicateNameForIndex(table, tableIndex),
      ),
      undefined,
      [COMMON_IDENTIFIERS.arg],
    ),
    ts.factory.createBlock(
      [
        ...createHandlingForGetByIndex({
          tableIndex,
          methodName,
          argumentsArray: [
            ts.factory.createArrayLiteralExpression(
              tableIndex.fields.map((next) => {
                return ts.factory.createPropertyAccessExpression(
                  COMMON_IDENTIFIERS.arg,
                  next.name.value,
                );
              }),
            ),
          ],
        }),
      ],
      true,
    ),
    createConditionsForIndexes({
      table,
      tableIndexes: remaining,
      keys,
    })[0],
  );
}

export function createHandlingForGetByPrimaryKey({
  methodName,
  argumentsArray,
}: {
  methodName: GetMethodName;
  argumentsArray: ReadonlyArray<ts.Expression>;
}): ReadonlyArray<ts.Statement> {
  return [
    ts.factory.createExpressionStatement(
      ts.factory.createAssignment(
        COMMON_IDENTIFIERS.DBGetRequest,
        ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            COMMON_IDENTIFIERS.store,
            ts.factory.createIdentifier(methodName),
          ),
          undefined,
          argumentsArray,
        ),
      ),
    ),
  ];
}

function createHandlingForPrimaryKeyGet({
  table,
  tableIndex,
  remaining,
  keys,
}: {
  table: TableDefinition;
  tableIndex: TableIndex;
  remaining: ReadonlyArray<TableIndex>;
  keys: ReadonlyArray<TableIndex>;
}): ts.IfStatement {
  return ts.factory.createIfStatement(
    ts.factory.createCallExpression(
      ts.factory.createIdentifier(
        createPredicateNameForIndex(table, tableIndex),
      ),
      undefined,
      [COMMON_IDENTIFIERS.arg],
    ),
    ts.factory.createBlock(
      [
        ...createHandlingForGetByPrimaryKey({
          methodName: 'get',
          argumentsArray: [
            ts.factory.createPropertyAccessExpression(
              COMMON_IDENTIFIERS.arg,
              tableIndex.name,
            ),
          ],
        }),
      ],
      true,
    ),
    createConditionsForIndexes({
      table,
      tableIndexes: remaining,
      keys,
    })[0],
  );
}

function createConditionsForIndexes({
  table,
  tableIndexes,
  keys,
}: {
  table: TableDefinition;
  tableIndexes: ReadonlyArray<TableIndex>;
  keys: ReadonlyArray<TableIndex>;
}): ReadonlyArray<ts.Statement> {
  if (tableIndexes.length > 0) {
    const [next, ...remaining] = tableIndexes;
    if (isPrimaryKey(next)) {
      return [
        createHandlingForPrimaryKeyGet({
          table,
          tableIndex: next,
          remaining,
          keys,
        }),
      ];
    } else {
      return [
        createHandlingForIndexGet({
          table,
          tableIndex: next,
          methodName: 'get',
          remaining,
          keys,
        }),
      ];
    }
  } else if (keys.length > 0) {
    return [
      ts.factory.createBlock(
        [
          ts.factory.createExpressionStatement(
            ts.factory.createAssignment(
              COMMON_IDENTIFIERS.DBGetRequest,
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  COMMON_IDENTIFIERS.store,
                  COMMON_IDENTIFIERS.get,
                ),
                undefined,
                [COMMON_IDENTIFIERS.arg],
              ),
            ),
          ),
        ],
        true,
      ),
    ];
  } else {
    return [];
  }
}

export function createSafeHandlingForRequest({
  table,
  database,
  methodName,
}: {
  table: TableDefinition;
  database: DatabaseDefinition;
  methodName: GetMethodName;
}) {
  return ts.factory.createIfStatement(
    ts.factory.createBinaryExpression(
      COMMON_IDENTIFIERS.DBGetRequest,
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.factory.createNull(),
    ),
    ts.factory.createBlock(
      [
        createOnErrorHandler(COMMON_IDENTIFIERS.DBGetRequest),
        createOnSuccessHandlerForGetMethod(table, database, methodName),
      ],
      true,
    ),
    ts.factory.createBlock(
      [
        ts.factory.createExpressionStatement(
          ts.factory.createCallExpression(
            COMMON_IDENTIFIERS.reject,
            undefined,
            [createNewErrorWithMessage('No available index for given query')],
          ),
        ),
      ],
      true,
    ),
  );
}

export function createDBGetRequestVariable(): ts.Statement {
  return createLetStatement(
    COMMON_IDENTIFIERS.DBGetRequest,
    ts.factory.createUnionTypeNode([
      ts.factory.createTypeReferenceNode(
        COMMON_IDENTIFIERS.IDBRequest,
        undefined,
      ),
      ts.factory.createLiteralTypeNode(ts.factory.createNull()),
    ]),
    ts.factory.createNull(),
  );
}

function createIndexNarrowing(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  const tableIndexes: ReadonlyArray<TableIndex> =
    getIndexesForTableAsArray(table);
  const keys = tableIndexes.filter((next) => next.kind !== 'index');

  return [
    createDBGetRequestVariable(),
    ...createConditionsForIndexes({ table, tableIndexes, keys }),
    createSafeHandlingForRequest({ table, database, methodName: 'get' }),
  ];
}

function normalizeName(name: string): string {
  let result = name;
  if (result.includes('-')) {
    result = result
      .split('-')
      .map((next) => capitalize(next))
      .join('');
  }

  if (result.includes('_')) {
    result = result
      .split('_')
      .map((next) => capitalize(next))
      .join('');
  }

  return capitalize(result);
}

export function createPredicateNameForIndex(
  table: TableDefinition,
  index: TableIndex,
): string {
  return `is${capitalize(table.name.value)}${normalizeName(index.name)}Index`;
}

export function createIndexPredicates(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  const indexes: ReadonlyArray<TableIndex> = getIndexesForTableAsArray(table);

  return indexes.map((next) => {
    return createConstStatement(
      ts.factory.createIdentifier(createPredicateNameForIndex(table, next)),
      undefined,
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            COMMON_IDENTIFIERS.arg,
            ts.factory.createToken(ts.SyntaxKind.QuestionToken),
            createGetArgsTypeNode(table),
            undefined,
          ),
        ],
        ts.factory.createTypePredicateNode(
          undefined,
          COMMON_IDENTIFIERS.arg,
          objectTypeForIndexResolvingPrimaryKeys(next, database),
        ),
        undefined,
        ts.factory.createBlock(
          [
            ts.factory.createReturnStatement(
              ts.factory.createBinaryExpression(
                ts.factory.createBinaryExpression(
                  ts.factory.createTypeOfExpression(COMMON_IDENTIFIERS.arg),
                  ts.SyntaxKind.EqualsEqualsEqualsToken,
                  ts.factory.createStringLiteral('object'),
                ),
                ts.SyntaxKind.AmpersandAmpersandToken,
                ts.factory.createBinaryExpression(
                  ts.factory.createBinaryExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createCallExpression(
                        ts.factory.createPropertyAccessExpression(
                          COMMON_IDENTIFIERS.Object,
                          'keys',
                        ),
                        undefined,
                        [COMMON_IDENTIFIERS.arg],
                      ),
                      'length',
                    ),
                    ts.SyntaxKind.EqualsEqualsEqualsToken,
                    ts.factory.createNumericLiteral(next.fields.length),
                  ),
                  ts.SyntaxKind.AmpersandAmpersandToken,
                  createReflectionForFields(next.fields),
                ),
              ),
            ),
          ],
          true,
        ),
      ),
    );
  });
}

function createReflectionForFields([
  next,
  ...remaining
]: ReadonlyArray<FieldDefinition>): ts.Expression {
  if (remaining.length === 0) {
    return ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.Reflect,
        'has',
      ),
      undefined,
      [COMMON_IDENTIFIERS.arg, ts.factory.createStringLiteral(next.name.value)],
    );
  } else {
    return ts.factory.createBinaryExpression(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.Reflect,
          'has',
        ),
        undefined,
        [
          COMMON_IDENTIFIERS.arg,
          ts.factory.createStringLiteral(next.name.value),
        ],
      ),
      ts.SyntaxKind.AmpersandAmpersandToken,
      createReflectionForFields(remaining),
    );
  }
}

function objectTypeForIndexResolvingPrimaryKeys(
  index: TableIndex,
  database: DatabaseDefinition,
): ts.TypeLiteralNode {
  return ts.factory.createTypeLiteralNode(
    index.fields.map((next) => {
      return ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier(next.name.value),
        undefined,
        typeNodeResolvingPrimaryKeys(next.type, database),
      );
    }),
  );
}

export function typeNodesForIndexResolvingPrimaryKeys(
  index: TableIndex,
  database: DatabaseDefinition,
): ReadonlyArray<ts.TypeNode> {
  switch (index.kind) {
    case 'autoincrement':
    case 'key':
      return [
        typeForTypeNode(index.fields[0].type),
        objectTypeForIndexResolvingPrimaryKeys(index, database),
      ];
    case 'index':
      return [objectTypeForIndexResolvingPrimaryKeys(index, database)];
    default:
      const _exhaustiveCheck: never = index.kind;
      throw new Error(
        `Non-exhaustive check for index kind ${_exhaustiveCheck}`,
      );
  }
}

export function createGetArgsTypeDeclaration(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.TypeAliasDeclaration {
  const indexes = getIndexesForTableAsArray(table);

  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(createGetArgsTypeName(table)),
    [],
    ts.factory.createUnionTypeNode(
      indexes.flatMap((next) => {
        return typeNodesForIndexResolvingPrimaryKeys(next, database);
      }),
    ),
  );
}

export function createOnSuccessHandlerForGetMethod(
  table: TableDefinition,
  database: DatabaseDefinition,
  methodName: GetMethodName,
): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.DBGetRequest,
        COMMON_IDENTIFIERS.onsuccess,
      ),
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [], // params
        undefined,
        undefined,
        ts.factory.createBlock(
          [createFieldResolution(table, database, methodName)],
          true,
        ),
      ),
    ),
  );
}

function resultAccess(): ts.PropertyAccessExpression {
  return ts.factory.createPropertyAccessExpression(
    ts.factory.createAsExpression(
      COMMON_IDENTIFIERS.DBGetRequest,
      ts.factory.createTypeReferenceNode(
        COMMON_IDENTIFIERS.IDBRequest,
        undefined,
      ),
    ),
    COMMON_IDENTIFIERS.result,
  );
}

function resultVariableName(table: TableDefinition): ts.Identifier {
  return ts.factory.createIdentifier(getItemNameForTable(table).toLowerCase());
}

function createFieldResolution(
  table: TableDefinition,
  database: DatabaseDefinition,
  methodName: GetMethodName,
): ts.Statement {
  const joins: ReadonlyArray<TableJoin> = getJoinsForTable(table, database);
  const isGetAll = methodName === 'getAll';

  if (joins.length === 0) {
    return createSafeHandlingForResult([
      ts.factory.createExpressionStatement(
        ts.factory.createCallExpression(COMMON_IDENTIFIERS.resolve, undefined, [
          resultAccess(),
        ]),
      ),
    ]);
  } else {
    return createSafeHandlingForResult([
      createConstStatement(
        resultVariableName(table),
        createItemTypeNodeWithoutJoinsForTable({
          table,
          asArray: isGetAll,
        }),
        resultAccess(),
      ),
      isGetAll
        ? createHandlingForGetAllWithJoin({ table, joins })
        : createHandlingForGetWithJoin({ table, joins }),
    ]);
  }
}

function createSafeHandlingForResult(
  body: ReadonlyArray<ts.Statement>,
): ts.IfStatement {
  return ts.factory.createIfStatement(
    ts.factory.createBinaryExpression(
      ts.factory.createBinaryExpression(
        COMMON_IDENTIFIERS.DBGetRequest,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.factory.createNull(),
      ),
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.factory.createBinaryExpression(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.DBGetRequest,
          COMMON_IDENTIFIERS.result,
        ),

        ts.SyntaxKind.ExclamationEqualsToken,
        ts.factory.createNull(),
      ),
    ),
    ts.factory.createBlock(body, true),
    ts.factory.createBlock(
      [
        ts.factory.createExpressionStatement(
          ts.factory.createCallExpression(
            COMMON_IDENTIFIERS.reject,
            undefined,
            [createNewErrorWithMessage('No result found for query')],
          ),
        ),
      ],
      true,
    ),
  );
}

function createClientCallForJoin(
  variableName: ts.Identifier,
  join: TableJoin,
): ts.Expression {
  const promiseCall = ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createIdentifier(clientVariableNameForTable(join.table)),
      COMMON_IDENTIFIERS.get,
    ),
    undefined,
    [
      ts.factory.createPropertyAccessExpression(variableName, join.fieldName),
      ts.factory.createObjectLiteralExpression([
        ts.factory.createPropertyAssignment(
          COMMON_IDENTIFIERS.transaction,
          COMMON_IDENTIFIERS.tx,
        ),
      ]),
    ],
  );

  if (join.required) {
    return promiseCall;
  } else {
    return ts.factory.createConditionalExpression(
      ts.factory.createBinaryExpression(
        ts.factory.createPropertyAccessExpression(variableName, join.fieldName),
        ts.SyntaxKind.EqualsEqualsToken,
        ts.factory.createNull(),
      ),
      undefined,
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.Promise,
          COMMON_IDENTIFIERS.resolve,
        ),
        [createNullType()],
        [ts.factory.createNull()],
      ),
      undefined,
      promiseCall,
    );
  }
}

function createReturnObjectLiteral(
  variableName: ts.Identifier,
  table: TableDefinition,
  joins: ReadonlyArray<TableJoin>,
): ts.Expression {
  return ts.factory.createAsExpression(
    ts.factory.createObjectLiteralExpression(
      [
        ts.factory.createSpreadAssignment(variableName),
        ...joins.map((next) => {
          const shorthand = ts.factory.createShorthandPropertyAssignment(
            ts.factory.createIdentifier(next.fieldName),
            undefined,
          );

          if (next.required) {
            return shorthand;
          } else {
            return ts.factory.createSpreadAssignment(
              ts.factory.createConditionalExpression(
                ts.factory.createBinaryExpression(
                  ts.factory.createIdentifier(next.fieldName),
                  ts.SyntaxKind.EqualsEqualsToken,
                  ts.factory.createNull(),
                ),
                undefined,
                ts.factory.createObjectLiteralExpression([]),
                undefined,
                ts.factory.createObjectLiteralExpression([shorthand]),
              ),
            );
          }
        }),
      ],
      true,
    ),
    createItemTypeNodeForTable({
      table,
      asArray: false,
      withJoins: true,
    }),
  );
}

function createHandlingForGetWithJoin({
  table,
  joins,
}: {
  table: TableDefinition;
  joins: ReadonlyArray<TableJoin>;
}): ts.Statement {
  return createIfWithJoins({
    table,
    thenBlock: ts.factory.createBlock([
      ts.factory.createExpressionStatement(
        createPromiseDotAll(
          [
            ts.factory.createArrayLiteralExpression(
              joins.map((next) => {
                return createClientCallForJoin(resultVariableName(table), next);
              }),
              true,
            ),
          ],
          ts.factory.createArrowFunction(
            undefined,
            undefined,
            [
              ts.factory.createParameterDeclaration(
                undefined,
                undefined,
                undefined,
                ts.factory.createArrayBindingPattern(
                  joins.map((next) => {
                    return ts.factory.createBindingElement(
                      undefined,
                      undefined,
                      next.fieldName,
                      undefined,
                    );
                  }),
                ),
              ),
            ],
            undefined,
            undefined,
            ts.factory.createBlock(
              [
                ts.factory.createExpressionStatement(
                  ts.factory.createCallExpression(
                    COMMON_IDENTIFIERS.resolve,
                    undefined,
                    [
                      createReturnObjectLiteral(
                        resultVariableName(table),
                        table,
                        joins,
                      ),
                    ],
                  ),
                ),
              ],
              true,
            ),
          ),
        ),
      ),
    ]),
  });
}

function createHandlingForGetAllWithJoin({
  table,
  joins,
}: {
  table: TableDefinition;
  joins: ReadonlyArray<TableJoin>;
}): ts.Statement {
  return createIfWithJoins({
    table,
    thenBlock: ts.factory.createBlock(
      [
        ts.factory.createExpressionStatement(
          createPromiseDotAll(
            [
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  resultVariableName(table),
                  'map',
                ),
                undefined,
                [
                  ts.factory.createArrowFunction(
                    undefined,
                    undefined,
                    [
                      ts.factory.createParameterDeclaration(
                        undefined,
                        undefined,
                        undefined,
                        COMMON_IDENTIFIERS.result,
                      ),
                    ],
                    undefined,
                    undefined,
                    ts.factory.createBlock(
                      [
                        ts.factory.createReturnStatement(
                          createPromiseDotAll(
                            [
                              ts.factory.createArrayLiteralExpression(
                                joins.map((next) => {
                                  return createClientCallForJoin(
                                    COMMON_IDENTIFIERS.result,
                                    next,
                                  );
                                }),
                                true,
                              ),
                            ],
                            ts.factory.createArrowFunction(
                              undefined,
                              undefined,
                              [
                                ts.factory.createParameterDeclaration(
                                  undefined,
                                  undefined,
                                  undefined,
                                  ts.factory.createArrayBindingPattern(
                                    joins.map((next) => {
                                      return ts.factory.createBindingElement(
                                        undefined,
                                        undefined,
                                        next.fieldName,
                                        undefined,
                                      );
                                    }),
                                  ),
                                ),
                              ],
                              undefined,
                              undefined,
                              ts.factory.createBlock(
                                [
                                  ts.factory.createReturnStatement(
                                    createReturnObjectLiteral(
                                      COMMON_IDENTIFIERS.result,
                                      table,
                                      joins,
                                    ),
                                  ),
                                ],
                                true,
                              ),
                            ),
                          ),
                        ),
                      ],
                      true,
                    ),
                  ),
                ],
              ),
            ],
            ts.factory.createArrowFunction(
              undefined,
              undefined,
              [
                ts.factory.createParameterDeclaration(
                  undefined,
                  undefined,
                  undefined,
                  COMMON_IDENTIFIERS.result,
                  undefined,
                  createItemTypeNodeForTable({
                    table,
                    asArray: true,
                    withJoins: true,
                  }),
                ),
              ],
              undefined,
              undefined,
              ts.factory.createBlock([createResolveWithResult()], true),
            ),
          ),
        ),
      ],
      true,
    ),
  });
}

function createIfWithJoins({
  table,
  thenBlock,
}: {
  table: TableDefinition;
  thenBlock: ts.Block;
}): ts.IfStatement {
  return ts.factory.createIfStatement(
    ts.factory.createBinaryExpression(
      ts.factory.createPropertyAccessChain(
        COMMON_IDENTIFIERS.options,
        ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
        COMMON_IDENTIFIERS.withJoins,
      ),
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.factory.createFalse(),
    ),
    thenBlock,
    ts.factory.createBlock(
      [
        ts.factory.createExpressionStatement(
          ts.factory.createCallExpression(
            COMMON_IDENTIFIERS.resolve,
            undefined,
            [resultVariableName(table)],
          ),
        ),
      ],
      true,
    ),
  );
}

function createResolveWithResult(): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createCallExpression(COMMON_IDENTIFIERS.resolve, undefined, [
      COMMON_IDENTIFIERS.result,
    ]),
  );
}

function createPromiseDotAll(
  argumentsArray: ReadonlyArray<ts.Expression>,
  thenHandler: ts.ArrowFunction,
): ts.Expression {
  return ts.factory.createCallExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.Promise,
          'all',
        ),
        undefined,
        argumentsArray,
      ),
      'then',
    ),
    undefined,
    [thenHandler],
  );
}
