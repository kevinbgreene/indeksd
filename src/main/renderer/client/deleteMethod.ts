import * as ts from 'typescript';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import {
  createConstStatement,
  createLetStatement,
  createNewErrorWithMessage,
  createNewPromiseWithBody,
} from '../helpers';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { getIndexesForTableAsArray, TableIndex } from '../keys';
import { createVoidType } from '../types';
import { capitalize } from '../utils';
import { createOnErrorHandler } from './common';
import {
  createArgParamDeclaration,
  createOptionsParamForGetMethod,
  createPredicateNameForIndex,
  typeNodesForIndexResolvingPrimaryKeys,
} from './getMethod';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';

export function createDeleteArgsTypeName(table: TableDefinition): string {
  return `${capitalize(table.name.value)}DeleteArgs`;
}

export function typeReferenceForDeleteMethodByTable(
  table: TableDefinition,
): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(createDeleteArgsTypeName(table));
}

export function createDeleteArgsTypeDeclaration(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.TypeAliasDeclaration {
  const primaryKey = getIndexesForTableAsArray(table).filter((next) => {
    return next.kind === 'key' || next.kind === 'autoincrement';
  });

  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(createDeleteArgsTypeName(table)),
    [],
    ts.factory.createUnionTypeNode(
      primaryKey.flatMap((next) => {
        return typeNodesForIndexResolvingPrimaryKeys(next, database);
      }),
    ),
  );
}

function createDeleteMethodReturnType(): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
    createVoidType(),
  ]);
}

function createDBDeleteRequestVariable(): ts.Statement {
  return createLetStatement(
    COMMON_IDENTIFIERS.DBDeleteRequest,
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

export function createDeleteMethodSignatureForTable(
  table: TableDefinition,
): ts.MethodSignature {
  return ts.factory.createMethodSignature(
    undefined,
    COMMON_IDENTIFIERS.delete,
    undefined,
    undefined,
    [
      createArgParamDeclaration(
        true,
        typeReferenceForDeleteMethodByTable(table),
      ),
      createOptionsParamForGetMethod({ withJoins: 'none', withCount: false }),
    ],
    createDeleteMethodReturnType(),
  );
}

function createDeleteMethodDeclaration({
  table,
  methodBody,
}: {
  table: TableDefinition;
  methodBody?: ts.Block;
}): ts.MethodDeclaration {
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.delete,
    undefined,
    undefined,
    [
      createArgParamDeclaration(
        true,
        typeReferenceForDeleteMethodByTable(table),
      ),
      createOptionsParamForGetMethod({ withJoins: 'none', withCount: false }),
    ],
    createDeleteMethodReturnType(),
    methodBody,
  );
}

export function createDeleteMethod(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.MethodDeclaration {
  return createDeleteMethodDeclaration({
    table,
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
                  mode: 'readwrite',
                  withJoins: false,
                }),
                createGetObjectStore(table.name.value),
                createDBDeleteRequestVariable(),
                ...createIndexNarrowing(table),
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

export function createSafeHandlingForRequest() {
  return ts.factory.createIfStatement(
    ts.factory.createBinaryExpression(
      COMMON_IDENTIFIERS.DBDeleteRequest,
      ts.SyntaxKind.ExclamationEqualsToken,
      ts.factory.createNull(),
    ),
    ts.factory.createBlock(
      [
        createOnErrorHandler(COMMON_IDENTIFIERS.DBDeleteRequest),
        createOnSuccessHandlerForDeleteMethod(),
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

function createOnSuccessHandlerForDeleteMethod(): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.DBDeleteRequest,
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
            ts.factory.createExpressionStatement(
              ts.factory.createCallExpression(
                COMMON_IDENTIFIERS.resolve,
                undefined,
                [COMMON_IDENTIFIERS.undefined],
              ),
            ),
          ],
          true,
        ),
      ),
    ),
  );
}

function createIndexNarrowing(
  table: TableDefinition,
): ReadonlyArray<ts.Statement> {
  const primaryKeys: ReadonlyArray<TableIndex> = getIndexesForTableAsArray(
    table,
  ).filter((next) => next.kind !== 'index');

  if (primaryKeys.length !== 1) {
    throw new Error(
      `Expected one primary key for table ${table.name.value}, but found ${primaryKeys.length}`,
    );
  }

  return [
    createConditionsForPrimaryKey({ table, primaryKey: primaryKeys[0] }),
    createSafeHandlingForRequest(),
  ];
}

function createHandlingForDeleteByPrimaryKey(
  argumentsArray: ReadonlyArray<ts.Expression>,
): ReadonlyArray<ts.Statement> {
  return [
    ts.factory.createExpressionStatement(
      ts.factory.createAssignment(
        COMMON_IDENTIFIERS.DBDeleteRequest,
        ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            COMMON_IDENTIFIERS.store,
            COMMON_IDENTIFIERS.delete,
          ),
          undefined,
          argumentsArray,
        ),
      ),
    ),
  ];
}

function createConditionsForPrimaryKey({
  table,
  primaryKey,
}: {
  table: TableDefinition;
  primaryKey: TableIndex;
}): ts.Statement {
  return ts.factory.createIfStatement(
    ts.factory.createCallExpression(
      ts.factory.createIdentifier(
        createPredicateNameForIndex(table, primaryKey),
      ),
      undefined,
      [COMMON_IDENTIFIERS.arg],
    ),
    ts.factory.createBlock(
      [
        ...createHandlingForDeleteByPrimaryKey([
          ts.factory.createPropertyAccessExpression(
            COMMON_IDENTIFIERS.arg,
            primaryKey.name,
          ),
        ]),
      ],
      true,
    ),
    ts.factory.createBlock(
      [
        ts.factory.createExpressionStatement(
          ts.factory.createAssignment(
            COMMON_IDENTIFIERS.DBDeleteRequest,
            ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                COMMON_IDENTIFIERS.store,
                COMMON_IDENTIFIERS.delete,
              ),
              undefined,
              [COMMON_IDENTIFIERS.arg],
            ),
          ),
        ),
      ],
      true,
    ),
  );
}

export function createHandlingForDeleteByIndex({
  tableIndex,
  argumentsArray,
}: {
  tableIndex: TableIndex;
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
        COMMON_IDENTIFIERS.DBDeleteRequest,
        ts.factory.createCallExpression(
          ts.factory.createPropertyAccessExpression(
            COMMON_IDENTIFIERS.index,
            COMMON_IDENTIFIERS.delete,
          ),
          undefined,
          argumentsArray,
        ),
      ),
    ),
  ];
}
