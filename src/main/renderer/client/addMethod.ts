import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { createConstStatement, createNewPromiseWithBody } from '../helpers';
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

export function addMethodReturnType(table: TableDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
    ts.factory.createTypeReferenceNode(getItemNameForTable(table)),
  ]);
}

export function createAddArgsTypeName(table: TableDefinition): string {
  return `${capitalize(table.name.value)}AddArgs`;
}

export function createAddArgsTypeReference(
  table: TableDefinition,
): ts.TypeReferenceNode {
  return ts.factory.createTypeReferenceNode(createAddArgsTypeName(table));
}

export function createAddArgsTypeNode(table: TableDefinition): ts.TypeNode {
  const autoIncrementField = getAutoIncrementFieldForTable(table);
  const typeReferencNode = ts.factory.createTypeReferenceNode(
    getItemNameForTable(table),
  );

  if (autoIncrementField != null) {
    return ts.factory.createTypeReferenceNode('Omit', [
      typeReferencNode,
      ts.factory.createLiteralTypeNode(
        ts.factory.createStringLiteral(autoIncrementField.name.value),
      ),
    ]);
  }

  return typeReferencNode;
}

export function createAddArgsTypeDeclaration(
  table: TableDefinition,
): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(createAddArgsTypeName(table)),
    [],
    createAddArgsTypeNode(table),
  );
}

export function createArgsParamForAddMethod(
  table: TableDefinition,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.arg,
    undefined,
    ts.factory.createTypeReferenceNode(createAddArgsTypeName(table)),
  );
}

export function createAddMethod(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.MethodDeclaration {
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.add,
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.arg,
        undefined,
        createAddArgsTypeReference(table),
      ),
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

export function createAddMethodSignature(
  table: TableDefinition,
): ts.MethodSignature {
  return ts.factory.createMethodSignature(
    undefined,
    COMMON_IDENTIFIERS.add,
    undefined,
    undefined,
    [
      createArgsParamForAddMethod(table),
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
  return [
    createConstStatement(
      COMMON_IDENTIFIERS.DBAddRequest,
      ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBRequest),
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.store,
          COMMON_IDENTIFIERS.add,
        ),
        undefined,
        [COMMON_IDENTIFIERS.arg],
      ),
    ),
    createOnErrorHandler(COMMON_IDENTIFIERS.DBAddRequest),
    createOnSuccessHandler(COMMON_IDENTIFIERS.DBAddRequest, table),
  ];
}
