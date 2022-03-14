import * as ts from 'typescript';
import { DatabaseDefinition } from '../../parser';
import { createAddRequestHandling } from './addMethod';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';

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
    ts.factory.createTypeReferenceNode(
      ts.factory.createIdentifier(def.name.value),
    ), // return type
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createObjectLiteralExpression(
            def.body.map((next) => {
              return ts.factory.createPropertyAssignment(
                next.name.value.toLowerCase(),
                ts.factory.createObjectLiteralExpression(
                  [
                    ts.factory.createPropertyAssignment(
                      'add',
                      ts.factory.createArrowFunction(
                        undefined,
                        undefined,
                        [],
                        undefined,
                        undefined,
                        ts.factory.createBlock(
                          [
                            createTransactionWithMode(
                              next.name.value,
                              'readwrite',
                            ),
                            createGetObjectStore(next.name.value),
                            ...createAddRequestHandling(next),
                          ],
                          true,
                        ),
                      ),
                    ),
                  ],
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
