import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import {
  createIndexesTypeReferenceForTable,
  indexTypeNameForTable,
} from './type';
import { getIndexesForTableAsArray, isPrimaryKey, TableIndex } from '../keys';
import { createNeverType } from '../types';
import { createTransactionWithMode } from './transaction';
import { createGetObjectStore } from './objectStore';
import { createConstStatement, createNewPromiseWithBody } from '../helpers';
import {
  createSafeHandlingForRequest,
  createOptionsParamForGetMethod,
  createGetMethodReturnTypeForTable,
  createGetMethodBaseReturnTypeForTable,
  WithJoins,
} from './getMethod';
import { capitalize } from '../utils';
import { getJoinsForTable, typeNodeResolvingPrimaryKeys } from '../joins';
import { createDefaultClauseForIndexHandling } from './common';

function createWhereQueryTypeName(table: TableDefinition): string {
  return `${capitalize(table.name.value)}WhereQueryType`;
}

function createWhereQueryTypeReference(table: TableDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(createWhereQueryTypeName(table), [
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IndexName),
  ]);
}

export function createWhereQueryType(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    createWhereQueryTypeName(table),
    [
      ts.factory.createTypeParameterDeclaration(
        COMMON_IDENTIFIERS.IndexName,
        ts.factory.createTypeReferenceNode(indexTypeNameForTable(table)),
      ),
    ],
    createQueryArgumentConditionalType(table, database),
  );
}

function createExecuteQueryFunction(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.Statement {
  return createConstStatement(
    COMMON_IDENTIFIERS.executeQuery,
    undefined,
    ts.factory.createArrowFunction(
      undefined,
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          undefined,
          COMMON_IDENTIFIERS.target,
          undefined,
          ts.factory.createUnionTypeNode([
            ts.factory.createTypeReferenceNode(
              COMMON_IDENTIFIERS.IDBObjectStore,
            ),
            ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBIndex),
          ]),
        ),
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          undefined,
          COMMON_IDENTIFIERS.range,
          undefined,
          ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBKeyRange),
        ),
      ],
      undefined,
      undefined,
      ts.factory.createBlock(
        [
          ts.factory.createReturnStatement(
            createNewPromiseWithBody(
              ts.factory.createToken(ts.SyntaxKind.AsyncKeyword),
              [createPromiseReturnType(table, database)],
              ts.factory.createBlock([
                createConstStatement(
                  COMMON_IDENTIFIERS.DBGetRequest,
                  ts.factory.createTypeReferenceNode(
                    COMMON_IDENTIFIERS.IDBRequest,
                  ),
                  ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                      COMMON_IDENTIFIERS.target,
                      COMMON_IDENTIFIERS.getAll,
                    ),
                    undefined,
                    [COMMON_IDENTIFIERS.range],
                  ),
                ),
                createSafeHandlingForRequest({
                  table,
                  database,
                  methodName: 'getAll',
                }),
              ]),
            ),
          ),
        ],
        true,
      ),
    ),
  );
}

type QueryMethod = 'lowerBound' | 'upperBound' | 'only' | 'bound';

function createBoundQuery(
  database: DatabaseDefinition,
  tableIndex: TableIndex,
): ReadonlyArray<ts.Expression> {
  if (tableIndex.fields.length > 1) {
    return [
      ts.factory.createArrayLiteralExpression(
        tableIndex.fields.map((next) => {
          return ts.factory.createPropertyAccessExpression(
            ts.factory.createAsExpression(
              ts.factory.createPropertyAccessExpression(
                COMMON_IDENTIFIERS.query,
                COMMON_IDENTIFIERS.from,
              ),
              ts.factory.createTypeLiteralNode(
                tableIndex.fields.map((field) => {
                  return ts.factory.createPropertySignature(
                    undefined,
                    field.name.value,
                    undefined,
                    typeNodeResolvingPrimaryKeys(field.type, database),
                  );
                }),
              ),
            ),
            next.name.value,
          );
        }),
      ),
      ts.factory.createArrayLiteralExpression(
        tableIndex.fields.map((next) => {
          return ts.factory.createPropertyAccessExpression(
            ts.factory.createAsExpression(
              ts.factory.createPropertyAccessExpression(
                COMMON_IDENTIFIERS.query,
                COMMON_IDENTIFIERS.to,
              ),
              ts.factory.createTypeLiteralNode(
                tableIndex.fields.map((field) => {
                  return ts.factory.createPropertySignature(
                    undefined,
                    field.name.value,
                    undefined,
                    typeNodeResolvingPrimaryKeys(field.type, database),
                  );
                }),
              ),
            ),
            next.name.value,
          );
        }),
      ),
    ];
  } else {
    return [
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.query,
        COMMON_IDENTIFIERS.from,
      ),
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.query,
        COMMON_IDENTIFIERS.to,
      ),
    ];
  }
}

function createCompoundQuery(
  database: DatabaseDefinition,
  tableIndex: TableIndex,
): ReadonlyArray<ts.Expression> {
  return [
    ts.factory.createArrayLiteralExpression(
      tableIndex.fields.map((next) => {
        return ts.factory.createPropertyAccessExpression(
          ts.factory.createAsExpression(
            COMMON_IDENTIFIERS.query,
            ts.factory.createTypeLiteralNode(
              tableIndex.fields.map((field) => {
                return ts.factory.createPropertySignature(
                  undefined,
                  field.name.value,
                  undefined,
                  typeNodeResolvingPrimaryKeys(field.type, database),
                );
              }),
            ),
          ),
          next.name.value,
        );
      }),
    ),
  ];
}

function createExecuteQueryCallForCase({
  database,
  tableIndex,
  queryMethod,
  inclusive,
}: {
  database: DatabaseDefinition;
  tableIndex: TableIndex;
  queryMethod: QueryMethod;
  inclusive: boolean;
}): ts.Statement {
  const query: ReadonlyArray<ts.Expression> =
    queryMethod === 'bound'
      ? createBoundQuery(database, tableIndex)
      : tableIndex.fields.length > 1
      ? createCompoundQuery(database, tableIndex)
      : [COMMON_IDENTIFIERS.query];

  const options: ReadonlyArray<ts.Expression> =
    queryMethod === 'bound'
      ? inclusive
        ? [ts.factory.createFalse(), ts.factory.createFalse()]
        : [ts.factory.createTrue(), ts.factory.createTrue()]
      : queryMethod === 'only'
      ? []
      : inclusive
      ? [ts.factory.createFalse()]
      : [ts.factory.createTrue()];

  return ts.factory.createReturnStatement(
    ts.factory.createCallExpression(
      COMMON_IDENTIFIERS.executeQuery,
      undefined,
      [
        isPrimaryKey(tableIndex)
          ? COMMON_IDENTIFIERS.store
          : ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                COMMON_IDENTIFIERS.store,
                COMMON_IDENTIFIERS.index,
              ),
              undefined,
              [ts.factory.createStringLiteral(tableIndex.name)],
            ),
        ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            COMMON_IDENTIFIERS.IDBKeyRange,
            queryMethod,
          ),
          undefined,
          [...query, ...options],
        ),
      ],
    ),
  );
}

function createQueryParameterDeclaration(): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.query,
    undefined,
    undefined,
  );
}

const METHOD_MAP = {
  isGreaterThan: 'lowerBound',
  isGreaterThanOrEqualTo: 'lowerBound',
  isLessThan: 'upperBound',
  isLessThanOrEqualTo: 'upperBound',
  isBetween: 'bound',
  isEqualTo: 'only',
} as const;

const INCLUSIVE_MAP = {
  isGreaterThan: false,
  isGreaterThanOrEqualTo: true,
  isLessThan: false,
  isLessThanOrEqualTo: true,
  isBetween: true,
  isEqualTo: true,
} as const;

type MethodName =
  | 'isGreaterThan'
  | 'isGreaterThanOrEqualTo'
  | 'isLessThan'
  | 'isLessThanOrEqualTo'
  | 'isBetween'
  | 'isEqualTo';

function createRangeQueryMethodImplementation({
  database,
  indexes,
  methodName,
}: {
  database: DatabaseDefinition;
  indexes: ReadonlyArray<TableIndex>;
  methodName: MethodName;
}): ts.MethodDeclaration {
  const nativeMethod = METHOD_MAP[methodName];
  const isInclusive = INCLUSIVE_MAP[methodName];
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    undefined,
    methodName,
    undefined,
    [],
    [createQueryParameterDeclaration()],
    undefined,
    ts.factory.createBlock(
      [
        ts.factory.createSwitchStatement(
          COMMON_IDENTIFIERS.indexName,
          ts.factory.createCaseBlock([
            ...indexes.map((next) => {
              return ts.factory.createCaseClause(
                ts.factory.createStringLiteral(next.name),
                [
                  ts.factory.createBlock(
                    [
                      createExecuteQueryCallForCase({
                        database,
                        tableIndex: next,
                        queryMethod: nativeMethod,
                        inclusive: isInclusive,
                      }),
                    ],
                    true,
                  ),
                ],
              );
            }),
            createDefaultClauseForIndexHandling(),
          ]),
        ),
      ],
      true,
    ),
  );
}

function createRangeQueryImplementation(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.ObjectLiteralExpression {
  const indexes = getIndexesForTableAsArray(table);

  return ts.factory.createObjectLiteralExpression(
    [
      createRangeQueryMethodImplementation({
        database,
        indexes,
        methodName: 'isGreaterThan',
      }),
      createRangeQueryMethodImplementation({
        database,
        indexes,
        methodName: 'isGreaterThanOrEqualTo',
      }),
      createRangeQueryMethodImplementation({
        database,
        indexes,
        methodName: 'isLessThan',
      }),
      createRangeQueryMethodImplementation({
        database,
        indexes,
        methodName: 'isLessThanOrEqualTo',
      }),
      createRangeQueryMethodImplementation({
        database,
        indexes,
        methodName: 'isBetween',
      }),
      createRangeQueryMethodImplementation({
        database,
        indexes,
        methodName: 'isEqualTo',
      }),
    ],
    true,
  );
}

function createTypeNodeForIndex(
  tableIndex: TableIndex,
  database: DatabaseDefinition,
): ts.TypeNode {
  const numFields = tableIndex.fields.length;
  if (numFields > 1) {
    return ts.factory.createTypeLiteralNode(
      tableIndex.fields.map((next) => {
        return ts.factory.createPropertySignature(
          undefined,
          next.name.value,
          undefined,
          typeNodeResolvingPrimaryKeys(next.type, database),
        );
      }),
    );
  } else {
    return typeNodeResolvingPrimaryKeys(tableIndex.fields[0].type, database);
  }
}

function createQueryArgumentConditionalType(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.TypeNode {
  const indexes = getIndexesForTableAsArray(table);

  function createNestedConditional([
    next,
    ...remaining
  ]: ReadonlyArray<TableIndex>): ts.TypeNode {
    if (next != null) {
      return ts.factory.createConditionalTypeNode(
        ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IndexName),
        ts.factory.createLiteralTypeNode(
          ts.factory.createStringLiteral(next.name),
        ),
        createTypeNodeForIndex(next, database),
        createNestedConditional(remaining),
      );
    } else {
      return createNeverType();
    }
  }

  return createNestedConditional(indexes);
}

function createQueryArgumentParameterDeclaration(): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.arg,
    undefined,
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.ArgType),
  );
}

function createBetweenQueryArgumentParameterDeclaration(): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.arg,
    undefined,
    ts.factory.createTypeLiteralNode([
      ts.factory.createPropertySignature(
        undefined,
        COMMON_IDENTIFIERS.from,
        undefined,
        ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.ArgType),
      ),
      ts.factory.createPropertySignature(
        undefined,
        COMMON_IDENTIFIERS.to,
        undefined,
        ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.ArgType),
      ),
    ]),
  );
}

function createRangeQueryMethodSignature(
  methodName: MethodName,
): ts.MethodSignature {
  const paramDeclaration =
    methodName === 'isBetween'
      ? createBetweenQueryArgumentParameterDeclaration()
      : createQueryArgumentParameterDeclaration();

  return ts.factory.createMethodSignature(
    undefined,
    methodName,
    undefined,
    undefined,
    [paramDeclaration],
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.ReturnType),
  );
}

function createRangeQueryTypeNode(): ts.TypeNode {
  return ts.factory.createTypeLiteralNode([
    createRangeQueryMethodSignature('isGreaterThan'),
    createRangeQueryMethodSignature('isGreaterThanOrEqualTo'),
    createRangeQueryMethodSignature('isLessThan'),
    createRangeQueryMethodSignature('isLessThanOrEqualTo'),
    createRangeQueryMethodSignature('isBetween'),
    createRangeQueryMethodSignature('isEqualTo'),
  ]);
}

export function createRangeQueryTypeDeclaration(): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    undefined,
    COMMON_IDENTIFIERS.RangeQuery,
    [
      ts.factory.createTypeParameterDeclaration(COMMON_IDENTIFIERS.ArgType),
      ts.factory.createTypeParameterDeclaration(COMMON_IDENTIFIERS.ReturnType),
    ],
    createRangeQueryTypeNode(),
  );
}

function createPromiseReturnType(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.TypeNode {
  const joins = getJoinsForTable(table, database);
  const hasJoins = joins.length > 0;

  return createGetMethodBaseReturnTypeForTable({
    table,
    asUnion: hasJoins,
    withJoins: hasJoins,
    asArray: true,
  });
}

function createRangeQueryTypeReferenceForTable({
  table,
  asUnion,
  withJoins,
}: {
  table: TableDefinition;
  asUnion: boolean;
  withJoins: boolean;
}): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.RangeQuery, [
    createWhereQueryTypeReference(table),
    createGetMethodReturnTypeForTable({
      table,
      asUnion,
      withJoins,
      asArray: true,
    }),
  ]);
}

function createIndexNameParameterDeclaration(): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.indexName,
    undefined,
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IndexName, undefined),
  );
}

function createWhereMethodSignature({
  table,
  withJoins,
}: {
  table: TableDefinition;
  withJoins: WithJoins;
}): ts.MethodSignature {
  return ts.factory.createMethodSignature(
    undefined,
    COMMON_IDENTIFIERS.where,
    undefined,
    [
      ts.factory.createTypeParameterDeclaration(
        COMMON_IDENTIFIERS.IndexName,
        createIndexesTypeReferenceForTable(table),
        undefined,
      ),
    ],
    [
      createIndexNameParameterDeclaration(),
      createOptionsParamForGetMethod({ withJoins, withCount: false }),
    ],
    createRangeQueryTypeReferenceForTable({
      table,
      asUnion: withJoins === 'default',
      withJoins: withJoins === 'true' || withJoins === 'default',
    }),
  );
}

export function createWhereMethodSignaturesForTable(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.MethodSignature> {
  const joins = getJoinsForTable(table, database);

  if (joins.length > 0) {
    return [
      createWhereMethodSignature({ table, withJoins: 'true' }),
      createWhereMethodSignature({ table, withJoins: 'false' }),
      createWhereMethodSignature({ table, withJoins: 'default' }),
    ];
  } else {
    return [createWhereMethodSignature({ table, withJoins: 'none' })];
  }
}

function createWhereMethodDeclaration({
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
    COMMON_IDENTIFIERS.where,
    undefined,
    [
      ts.factory.createTypeParameterDeclaration(
        COMMON_IDENTIFIERS.IndexName,
        createIndexesTypeReferenceForTable(table),
        undefined,
      ),
    ],
    [
      createIndexNameParameterDeclaration(),
      createOptionsParamForGetMethod({ withJoins, withCount: false }),
    ],
    createRangeQueryTypeReferenceForTable({
      table,
      asUnion: withJoins === 'default',
      withJoins: withJoins === 'true' || withJoins === 'default',
    }),
    methodBody,
  );
}

export function createWhereMethodDeclarations({
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
      createWhereMethodDeclaration({
        table,
        withJoins: 'true',
      }),
      createWhereMethodDeclaration({
        table,
        withJoins: 'false',
      }),
      createWhereMethodDeclaration({
        table,
        withJoins: 'default',
        methodBody,
      }),
    ];
  } else {
    return [
      createWhereMethodDeclaration({
        table,
        withJoins: 'false',
        methodBody,
      }),
    ];
  }
}

export function createWhereMethod(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.MethodDeclaration> {
  return createWhereMethodDeclarations({
    table,
    database,
    methodBody: ts.factory.createBlock(
      [
        createTransactionWithMode({
          table,
          database,
          mode: 'readonly',
          withJoins: true,
        }),
        createGetObjectStore(table.name.value),
        createExecuteQueryFunction(table, database),
        ts.factory.createReturnStatement(
          createRangeQueryImplementation(table, database),
        ),
      ],
      true,
    ),
  });
}
