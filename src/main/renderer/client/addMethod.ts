import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../../identifiers';
import { TableDefinition } from '../../parser';
import { createConstStatement, createParameterDeclaration } from '../helpers';
import { autoincrementFieldsForTable } from '../keys';
import { createVoidType } from '../types';
import { capitalize } from '../utils';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { getItemNameForTable } from './type';

export function createGetArgsTypeName(def: TableDefinition): string {
  return `${capitalize(def.name.value)}AddArgs`;
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
          createAddTypeNode(def),
        ),
      ],
      ts.factory.createTypeReferenceNode('Promise', [createVoidType()]),
      undefined,
      ts.factory.createBlock(
        [
          createTransactionWithMode(def.name.value, 'readwrite'),
          createGetObjectStore(def.name.value),
          ...createAddRequestHandling(def),
        ],
        true,
      ),
    ),
  );
}

function createAddTypeNode(def: TableDefinition): ts.TypeNode {
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
    ts.factory.createExpressionStatement(
      ts.factory.createAssignment(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.addRequest,
          COMMON_IDENTIFIERS.onerror,
        ),
        ts.factory.createArrowFunction(
          undefined,
          undefined,
          [createParameterDeclaration(COMMON_IDENTIFIERS.event)],
          undefined,
          undefined,
          ts.factory.createBlock(
            [
              ts.factory.createExpressionStatement(
                ts.factory.createCallExpression(
                  COMMON_IDENTIFIERS.reject,
                  undefined,
                  [COMMON_IDENTIFIERS.event],
                ),
              ),
            ],
            true,
          ),
        ),
      ),
    ),
    ts.factory.createExpressionStatement(
      ts.factory.createAssignment(
        ts.factory.createPropertyAccessExpression(
          COMMON_IDENTIFIERS.addRequest,
          COMMON_IDENTIFIERS.onsuccess,
        ),
        ts.factory.createArrowFunction(
          undefined,
          undefined,
          [createParameterDeclaration(COMMON_IDENTIFIERS.event)],
          undefined,
          undefined,
          ts.factory.createBlock(
            [
              ts.factory.createExpressionStatement(
                ts.factory.createCallExpression(
                  COMMON_IDENTIFIERS.resolve,
                  undefined,
                  [],
                ),
              ),
            ],
            true,
          ),
        ),
      ),
    ),
  ];
}
