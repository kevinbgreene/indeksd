import * as ts from 'typescript';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import {
  createConstStatement,
  createNewErrorWithMessage,
  createNewPromiseWithBody,
} from '../helpers';
import { COMMON_IDENTIFIERS } from '../identifiers';
import {
  getIndexesForTableAsArray,
  getPrimaryKeyTypeForTable,
  TableIndex,
} from '../keys';
import { createPushMethodCall } from '../observable';
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
  return createConstStatement(
    COMMON_IDENTIFIERS.DBDeleteRequest,
    ts.factory.createTypeReferenceNode(
      COMMON_IDENTIFIERS.IDBRequest,
      undefined,
    ),
    ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.store,
        COMMON_IDENTIFIERS.delete,
      ),
      undefined,
      [COMMON_IDENTIFIERS.idToDelete],
    ),
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
            createPushMethodCall('delete', COMMON_IDENTIFIERS.idToDelete),
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
    createIdToDeleteVariableDeclaration({ table, primaryKey: primaryKeys[0] }),
    createDBDeleteRequestVariable(),
    createSafeHandlingForRequest(),
  ];
}

function createIdToDeleteVariableDeclaration({
  table,
  primaryKey,
}: {
  table: TableDefinition;
  primaryKey: TableIndex;
}): ts.Statement {
  return createConstStatement(
    COMMON_IDENTIFIERS.idToDelete,
    getPrimaryKeyTypeForTable(table),
    ts.factory.createConditionalExpression(
      ts.factory.createCallExpression(
        ts.factory.createIdentifier(
          createPredicateNameForIndex(table, primaryKey),
        ),
        undefined,
        [COMMON_IDENTIFIERS.arg],
      ),
      undefined,
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.arg,
        primaryKey.name,
      ),
      undefined,
      COMMON_IDENTIFIERS.arg,
    ),
  );
}
