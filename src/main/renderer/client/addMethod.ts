import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../../identifiers';
import { TableDefinition } from '../../parser';
import { createConstStatement, createParameterDeclaration } from '../helpers';
import { capitalize } from '../utils';

export function createGetArgsTypeName(def: TableDefinition): string {
  return `${capitalize(def.name.value)}AddArgs`;
}

export function createAddRequestHandling(
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
