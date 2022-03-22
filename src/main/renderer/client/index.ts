import * as ts from 'typescript';
import { DatabaseDefinition } from '../../parser';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { createAddMethod } from './addMethod';
import { createClientTypeNode } from './common';
import {
  createGetAllMethod,
  createGetMethod,
  createGetStoreForIndex,
} from './getMethod';

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
        COMMON_IDENTIFIERS.db,
        undefined,
        ts.factory.createTypeReferenceNode(
          ts.factory.createIdentifier('IDBDatabase'),
        ),
      ),
    ], // args
    createClientTypeNode(def), // return type
    ts.factory.createBlock(
      [
        ...def.body.flatMap((next) => {
          return createGetStoreForIndex(next);
        }),
        ts.factory.createReturnStatement(
          ts.factory.createObjectLiteralExpression(
            def.body.map((next) => {
              return ts.factory.createPropertyAssignment(
                next.name.value.toLowerCase(),
                ts.factory.createObjectLiteralExpression(
                  [
                    createAddMethod(next),
                    createGetMethod(next),
                    createGetAllMethod(next),
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
