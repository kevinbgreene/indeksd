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
  createNewPromiseWithBody,
} from '../helpers';
import { getIndexesForTable, isPrimaryKey, TableIndex } from '../keys';
import { typeForTypeNode } from '../types';
import { capitalize } from '../utils';
import { clientVariableNameForTable, createOnErrorHandler } from './common';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { createOptionsParameterDeclaration } from './type';
import {
  getItemNameWithJoinsForTable,
  getJoinsForTable,
  TableJoin,
  typeNodeResolvingPrimaryKeys,
} from '../joins';
import { getItemNameForTable } from '../common';

export function createGetArgsTypeName(def: TableDefinition): string {
  return `${capitalize(def.name.value)}GetArgs`;
}

export function createGetArgsTypeNode(def: TableDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(createGetArgsTypeName(def));
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
  const baseType = ts.factory.createTypeReferenceNode(
    getItemNameForTable(table),
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

export function createGetMethodSignaturesForTable({
  table,
  database,
  methodName,
}: {
  table: TableDefinition;
  database: DatabaseDefinition;
  methodName: 'get' | 'getAll';
}): ReadonlyArray<ts.MethodSignature> {
  const joins = getJoinsForTable(table, database);
  const asArray = methodName === 'getAll';

  if (joins.length > 0) {
    return [
      ts.factory.createMethodSignature(
        undefined,
        methodName,
        undefined,
        undefined,
        [
          createArgsParamForGetMethod(table),
          createOptionsParamForGetMethod({ withJoins: 'true' }),
        ],
        createGetMethodReturnTypeForTable({
          table,
          asArray,
          asUnion: false,
          withJoins: true,
        }),
      ),
      ts.factory.createMethodSignature(
        undefined,
        methodName,
        undefined,
        undefined,
        [
          createArgsParamForGetMethod(table),
          createOptionsParamForGetMethod({ withJoins: 'false' }),
        ],
        createGetMethodReturnTypeForTable({
          table,
          asArray,
          asUnion: false,
          withJoins: false,
        }),
      ),
      ts.factory.createMethodSignature(
        undefined,
        methodName,
        undefined,
        undefined,
        [
          createArgsParamForGetMethod(table),
          createOptionsParamForGetMethod({ withJoins: 'default' }),
        ],
        createGetMethodReturnTypeForTable({
          table,
          asArray,
          asUnion: true,
          withJoins: true,
        }),
      ),
    ];
  } else {
    return [
      ts.factory.createMethodSignature(
        undefined,
        methodName,
        undefined,
        undefined,
        [
          createArgsParamForGetMethod(table),
          createOptionsParamForGetMethod({ withJoins: 'none' }),
        ],
        createGetMethodReturnTypeForTable({
          table,
          asArray,
          asUnion: false,
          withJoins: false,
        }),
      ),
    ];
  }
}

function createOptionsParamForGetMethod({
  withJoins,
}: {
  withJoins: 'true' | 'false' | 'none' | 'default';
}): ts.ParameterDeclaration {
  switch (withJoins) {
    case 'true':
      return createOptionsParameterDeclaration({
        optional: true,
        includes: ['transaction', 'with_joins_true'],
      });
    case 'false':
      return createOptionsParameterDeclaration({
        optional: false,
        includes: ['transaction', 'with_joins_false'],
      });
    case 'none':
      return createOptionsParameterDeclaration({
        optional: true,
        includes: ['transaction'],
      });
    default:
      return createOptionsParameterDeclaration({
        optional: true,
        includes: ['transaction', 'with_joins_default'],
      });
  }
}

export function createArgsParamForGetMethod(
  table: TableDefinition,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.arg,
    undefined,
    ts.factory.createTypeReferenceNode(createGetArgsTypeName(table)),
  );
}

export function createGetMethodReturnTypeForTable({
  table,
  asArray,
  asUnion,
  withJoins,
}: {
  table: TableDefinition;
  asArray: boolean;
  asUnion: boolean;
  withJoins: boolean;
}): ts.TypeNode {
  if (asUnion) {
    return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
      ts.factory.createUnionTypeNode([
        createItemTypeNodeWithoutJoinsForTable({ table, asArray }),
        createItemTypeNodeWithJoinsForTable({ table, asArray }),
      ]),
    ]);
  }

  return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
    createItemTypeNodeForTable({ table, asArray, withJoins }),
  ]);
}

export function createGetMethodDeclarations({
  table,
  database,
  methodName,
  methodBody,
}: {
  table: TableDefinition;
  database: DatabaseDefinition;
  methodName: 'get' | 'getAll';
  methodBody: ts.Block;
}): ReadonlyArray<ts.MethodDeclaration> {
  const joins = getJoinsForTable(table, database);
  const asArray = methodName === 'getAll';

  if (joins.length > 0) {
    return [
      ts.factory.createMethodDeclaration(
        undefined,
        undefined,
        undefined,
        methodName,
        undefined,
        undefined,
        [
          createArgsParamForGetMethod(table),
          createOptionsParamForGetMethod({ withJoins: 'true' }),
        ],
        createGetMethodReturnTypeForTable({
          table,
          asArray,
          asUnion: false,
          withJoins: true,
        }),
        undefined,
      ),
      ts.factory.createMethodDeclaration(
        undefined,
        undefined,
        undefined,
        methodName,
        undefined,
        undefined,
        [
          createArgsParamForGetMethod(table),
          createOptionsParamForGetMethod({ withJoins: 'false' }),
        ],
        createGetMethodReturnTypeForTable({
          table,
          asArray,
          asUnion: false,
          withJoins: false,
        }),
        undefined,
      ),
      ts.factory.createMethodDeclaration(
        undefined,
        undefined,
        undefined,
        methodName,
        undefined,
        undefined,
        [
          createArgsParamForGetMethod(table),
          createOptionsParamForGetMethod({ withJoins: 'default' }),
        ],
        createGetMethodReturnTypeForTable({
          table,
          asArray,
          asUnion: true,
          withJoins: true,
        }),
        methodBody,
      ),
    ];
  } else {
    return [
      ts.factory.createMethodDeclaration(
        undefined,
        undefined,
        undefined,
        methodName,
        undefined,
        undefined,
        [
          createArgsParamForGetMethod(table),
          createOptionsParamForGetMethod({ withJoins: 'none' }),
        ],
        createGetMethodReturnTypeForTable({
          table,
          asArray,
          asUnion: false,
          withJoins: false,
        }),
        methodBody,
      ),
    ];
  }
}

export function createGetMethod({
  table,
  database,
  methodName,
}: {
  table: TableDefinition;
  database: DatabaseDefinition;
  methodName: 'get' | 'getAll';
}): ReadonlyArray<ts.MethodDeclaration> {
  return createGetMethodDeclarations({
    table,
    database,
    methodName,
    methodBody: ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          createNewPromiseWithBody(
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
                ...createIndexNarrowing({ table, database, methodName }),
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

function createHandlingForIndexGet({
  table,
  tableIndex,
  methodName,
  remaining,
  keys,
}: {
  table: TableDefinition;
  tableIndex: TableIndex;
  methodName: 'get' | 'getAll';
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
        createConstStatement(
          COMMON_IDENTIFIERS.index,
          ts.factory.createTypeReferenceNode('IDBIndex', undefined),
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
              [
                ts.factory.createArrayLiteralExpression(
                  tableIndex.fields.map((next) => {
                    return ts.factory.createPropertyAccessExpression(
                      COMMON_IDENTIFIERS.arg,
                      next.name.value,
                    );
                  }),
                ),
              ],
            ),
          ),
        ),
      ],
      true,
    ),
    createConditionsForIndexes({
      table,
      methodName,
      tableIndexes: remaining,
      keys,
    })[0],
  );
}

function createHandlingForPrimaryKeyGet({
  table,
  tableIndex,
  methodName,
  remaining,
  keys,
}: {
  table: TableDefinition;
  tableIndex: TableIndex;
  methodName: 'get' | 'getAll';
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
        ts.factory.createExpressionStatement(
          ts.factory.createAssignment(
            COMMON_IDENTIFIERS.DBGetRequest,
            ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                COMMON_IDENTIFIERS.store,
                ts.factory.createIdentifier(methodName),
              ),
              undefined,
              [
                ts.factory.createPropertyAccessExpression(
                  COMMON_IDENTIFIERS.arg,
                  tableIndex.name,
                ),
              ],
            ),
          ),
        ),
      ],
      true,
    ),
    createConditionsForIndexes({
      table,
      methodName,
      tableIndexes: remaining,
      keys,
    })[0],
  );
}

function createConditionsForIndexes({
  table,
  methodName,
  tableIndexes,
  keys,
}: {
  table: TableDefinition;
  methodName: 'get' | 'getAll';
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
          methodName,
          remaining,
          keys,
        }),
      ];
    } else {
      return [
        createHandlingForIndexGet({
          table,
          tableIndex: next,
          methodName,
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
                  ts.factory.createIdentifier(methodName),
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

export function createIndexNarrowing({
  table,
  database,
  methodName,
}: {
  table: TableDefinition;
  database: DatabaseDefinition;
  methodName: 'get' | 'getAll';
}): ReadonlyArray<ts.Statement> {
  const tableIndexes: ReadonlyArray<TableIndex> = Object.values(
    getIndexesForTable(table),
  )
    .flat()
    .filter((next): next is TableIndex => next != null);
  const keys = tableIndexes.filter((next) => next.kind !== 'index');

  return [
    createLetStatement(
      COMMON_IDENTIFIERS.DBGetRequest,
      ts.factory.createUnionTypeNode([
        ts.factory.createTypeReferenceNode(
          COMMON_IDENTIFIERS.IDBRequest,
          undefined,
        ),
        ts.factory.createLiteralTypeNode(ts.factory.createNull()),
      ]),
      ts.factory.createNull(),
    ),
    ...createConditionsForIndexes({ table, methodName, tableIndexes, keys }),
    ts.factory.createIfStatement(
      ts.factory.createBinaryExpression(
        COMMON_IDENTIFIERS.DBGetRequest,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.factory.createNull(),
      ),
      ts.factory.createBlock(
        [
          createOnErrorHandler(COMMON_IDENTIFIERS.DBGetRequest),
          createOnSuccessHandler(table, database, methodName),
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
                      'No available index for given query',
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

function createPredicateNameForIndex(
  def: TableDefinition,
  index: TableIndex,
): string {
  return `is${capitalize(def.name.value)}${normalizeName(index.name)}Index`;
}

export function createIndexPredicates(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  const indexes: ReadonlyArray<TableIndex> = Object.values(
    getIndexesForTable(table),
  )
    .flat()
    .filter((next): next is TableIndex => next != null);

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
            undefined,
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

function typeNodesForIndexResolvingPrimaryKeys(
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
  const indexes = Object.values(getIndexesForTable(table))
    .flat()
    .filter((next): next is TableIndex => next != null);
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

export function createOnSuccessHandler(
  table: TableDefinition,
  database: DatabaseDefinition,
  methodName: 'get' | 'getAll',
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
  methodName: 'get' | 'getAll',
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
            [
              ts.factory.createNewExpression(
                COMMON_IDENTIFIERS.Error,
                undefined,
                [ts.factory.createStringLiteral('No result found for query')],
              ),
            ],
          ),
        ),
      ],
      true,
    ),
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
                return ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier(
                      clientVariableNameForTable(next.table),
                    ),
                    COMMON_IDENTIFIERS.get,
                  ),
                  undefined,
                  [
                    ts.factory.createPropertyAccessExpression(
                      resultVariableName(table),
                      next.fieldName,
                    ),
                  ],
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
                ts.factory.createExpressionStatement(
                  ts.factory.createCallExpression(
                    COMMON_IDENTIFIERS.resolve,
                    undefined,
                    [
                      ts.factory.createObjectLiteralExpression(
                        [
                          ts.factory.createSpreadAssignment(
                            resultVariableName(table),
                          ),
                          ...joins.map((next) => {
                            return ts.factory.createShorthandPropertyAssignment(
                              ts.factory.createIdentifier(next.fieldName),
                              undefined,
                            );
                          }),
                        ],
                        true,
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
                                  return ts.factory.createCallExpression(
                                    ts.factory.createPropertyAccessExpression(
                                      ts.factory.createIdentifier(
                                        clientVariableNameForTable(next.table),
                                      ),
                                      COMMON_IDENTIFIERS.get,
                                    ),
                                    undefined,
                                    [
                                      ts.factory.createPropertyAccessExpression(
                                        COMMON_IDENTIFIERS.result,
                                        next.fieldName,
                                      ),
                                    ],
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
                                    ts.factory.createObjectLiteralExpression(
                                      [
                                        ts.factory.createSpreadAssignment(
                                          COMMON_IDENTIFIERS.result,
                                        ),
                                        ...joins.map((next) => {
                                          return ts.factory.createShorthandPropertyAssignment(
                                            ts.factory.createIdentifier(
                                              next.fieldName,
                                            ),
                                            undefined,
                                          );
                                        }),
                                      ],
                                      true,
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
