import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../../identifiers';
import { TableDefinition } from '../../parser';
import { createConstStatement, createNewPromiseWithBody } from '../helpers';
import {
  getAutoIncrementFieldForTable,
  getPrimaryKeyTypeForTable,
} from '../keys';
import { createOnErrorHandler, createOnSuccessHandler } from './common';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { getItemNameForTable } from './type';

function addMethodReturnType(def: TableDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
    getPrimaryKeyTypeForTable(def),
  ]);
}

export function createAddMethod(def: TableDefinition): ts.PropertyAssignment {
  return ts.factory.createPropertyAssignment(
    'add',
    ts.factory.createArrowFunction(
      undefined,
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          undefined,
          ts.factory.createIdentifier('arg'),
          undefined,
          createAddArgTypeNode(def),
        ),
      ],
      addMethodReturnType(def),
      undefined,
      ts.factory.createBlock(
        [
          ts.factory.createReturnStatement(
            createNewPromiseWithBody(
              ts.factory.createBlock(
                [
                  createTransactionWithMode(def.name.value, 'readwrite'),
                  createGetObjectStore(def.name.value),
                  ...createAddRequestHandling(def),
                ],
                true,
              ),
            ),
          ),
        ],
        true,
      ),
    ),
  );
}

export function createAddMethodTypeNode(def: TableDefinition): ts.TypeNode {
  return ts.factory.createFunctionTypeNode(
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        'arg',
        undefined,
        createAddArgTypeNode(def),
      ),
    ],
    addMethodReturnType(def),
  );
}

function createAddArgTypeNode(def: TableDefinition): ts.TypeNode {
  const autoIncrementField = getAutoIncrementFieldForTable(def);
  const typeReferencNode = ts.factory.createTypeReferenceNode(
    getItemNameForTable(def),
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

function createAddRequestHandling(
  def: TableDefinition,
): ReadonlyArray<ts.Statement> {
  return [
    createConstStatement(
      COMMON_IDENTIFIERS.addRequest,
      ts.factory.createTypeReferenceNode('IDBRequest'),
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier('store'),
          ts.factory.createIdentifier('add'),
        ),
        undefined,
        [ts.factory.createIdentifier('arg')],
      ),
    ),
    createOnErrorHandler('addRequest', getPrimaryKeyTypeForTable(def)),
    createOnSuccessHandler('addRequest', getPrimaryKeyTypeForTable(def)),
  ];
}
