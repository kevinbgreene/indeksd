import * as ts from 'typescript';
import { DatabaseDefinition } from '../../parser';
import { createAddMethod } from './addMethod';
import { createClientTypeNode } from './common';

export { createClientTypeDeclaration } from './type';
export { createClientTypeNode } from './common';

export function createClientFunction(def: DatabaseDefinition): ts.Statement {
  return ts.factory.createFunctionDeclaration(
    undefined,
    undefined,
    undefined,
    ts.factory.createIdentifier('createDatabaseClient'),
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        ts.factory.createIdentifier('db'),
        undefined,
        ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier('IDBDatabase'),
        ),
      ),
    ], // args
    createClientTypeNode(def), // return type
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createObjectLiteralExpression(
            def.body.map((next) => {
              return ts.factory.createPropertyAssignment(
                next.name.value.toLowerCase(),
                ts.factory.createObjectLiteralExpression(
                  [createAddMethod(next)],
                  true,
                ),
              );
            }),
            true,
          ),
        ),
      ],
      true,
    ),
  );
}

// function createPredicateForIndex() {
//   // createTypePredicateNode
//   // createTypeOfExpression
// }
