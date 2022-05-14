import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import {
  createConstStatement,
  createLetStatement,
  createNewPromiseWithBody,
} from '../helpers';
import {
  getAutoIncrementFieldForTable,
  getPrimaryKeyTypeForTable,
} from '../keys';
import { capitalize } from '../utils';
import { createOnErrorHandler, createOnSuccessHandler } from './common';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { createOptionsParameterDeclaration } from './type';
import { getItemNameForTable } from '../common';
import { addMethodReturnType, createAddArgsTypeReference } from './addMethod';

export function createPutArgsTypeName(table: TableDefinition): string {
  return `${capitalize(table.name.value)}PutArgs`;
}

export function createPutArgsTypeReference(
  table: TableDefinition,
): ts.TypeReferenceNode {
  return ts.factory.createTypeReferenceNode(createPutArgsTypeName(table));
}

export function createPutArgsTypeNode(table: TableDefinition): ts.TypeNode {
  return ts.factory.createUnionTypeNode([
    createAddArgsTypeReference(table),
    ts.factory.createTypeReferenceNode(getItemNameForTable(table)),
  ]);
}

export function createPutArgsTypeDeclaration(
  table: TableDefinition,
): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(createPutArgsTypeName(table)),
    [],
    createPutArgsTypeNode(table),
  );
}

export function createArgsParamForPutMethod(
  table: TableDefinition,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.arg,
    undefined,
    ts.factory.createTypeReferenceNode(createPutArgsTypeName(table)),
  );
}

export function createPutMethod(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.MethodDeclaration {
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.put,
    undefined,
    undefined,
    [
      createArgsParamForPutMethod(table),
      createOptionsParameterDeclaration({
        optional: true,
        includes: ['transaction'],
      }),
    ],
    addMethodReturnType(table),
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          createNewPromiseWithBody(
            ts.factory.createBlock(
              [
                createTransactionWithMode({
                  table,
                  database,
                  mode: 'readwrite',
                  withJoins: false,
                }),
                createGetObjectStore(table.name.value),
                ...createAddRequestHandling(table),
              ],
              true,
            ),
          ),
        ),
      ],
      true,
    ),
  );
}

export function createPutMethodSignature(
  table: TableDefinition,
): ts.MethodSignature {
  return ts.factory.createMethodSignature(
    undefined,
    COMMON_IDENTIFIERS.put,
    undefined,
    undefined,
    [
      createArgsParamForPutMethod(table),
      createOptionsParameterDeclaration({
        optional: true,
        includes: ['transaction'],
      }),
    ],
    addMethodReturnType(table),
  );
}

function createAddRequestHandling(
  table: TableDefinition,
): ReadonlyArray<ts.Statement> {
  const autoIncrementField = getAutoIncrementFieldForTable(table);
  const statements: Array<ts.Statement> = [];

  statements.push(
    createConstStatement(
      COMMON_IDENTIFIERS.DBPutRequest,
      ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBRequest),
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.store,
          COMMON_IDENTIFIERS.put,
        ),
        undefined,
        [COMMON_IDENTIFIERS.arg],
      ),
    ),
  );

  statements.push(
    createOnErrorHandler(COMMON_IDENTIFIERS.DBPutRequest),
    createOnSuccessHandler(COMMON_IDENTIFIERS.DBPutRequest, table),
  );

  return statements;
}
