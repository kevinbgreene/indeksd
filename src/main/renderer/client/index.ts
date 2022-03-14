import * as ts from 'typescript';
import { DatabaseDefinition } from '../../parser';
import { createVoidType } from '../types';
import { capitalize } from '../utils';
import { createAddRequestHandling } from './addMethod';
import { createClientTypeNode } from './common';
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
    createClientTypeNode(def), // return type
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
                        [
                          ts.factory.createParameterDeclaration(
                            undefined,
                            undefined,
                            undefined,
                            ts.factory.createIdentifier('arg'),
                            undefined,
                            ts.factory.createTypeReferenceNode(
                              capitalize(next.name.value),
                            ),
                          ),
                        ],
                        ts.factory.createTypeReferenceNode('Promise', [
                          createVoidType(),
                        ]),
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
