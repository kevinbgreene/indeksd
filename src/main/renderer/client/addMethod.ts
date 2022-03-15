import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../../identifiers';
import { TableDefinition } from '../../parser';
import { createConstStatement, createNewPromiseWithBody } from '../helpers';
import { autoincrementFieldsForTable } from '../keys';
import { createOnErrorHandler, createOnSuccessHandler } from './common';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { getItemNameForTable } from './type';

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
      ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
        ts.factory.createTypeReferenceNode(getItemNameForTable(def)),
      ]),
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
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
      ts.factory.createTypeReferenceNode(getItemNameForTable(def)),
    ]),
  );
}

function createAddArgTypeNode(def: TableDefinition): ts.TypeNode {
  const autoincrementFields = autoincrementFieldsForTable(def);
  const typeReferencNode = ts.factory.createTypeReferenceNode(
    getItemNameForTable(def),
  );

  if (autoincrementFields.length > 0) {
    const autoincrementField = autoincrementFields[0];
    return ts.factory.createTypeReferenceNode('Omit', [
      typeReferencNode,
      ts.factory.createLiteralTypeNode(
        ts.factory.createStringLiteral(autoincrementField.name.value),
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
    createOnErrorHandler('addRequest'),
    createOnSuccessHandler('addRequest'),
  ];
}
