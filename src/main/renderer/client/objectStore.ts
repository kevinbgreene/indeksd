import * as ts from 'typescript';
import { createConstStatement } from '../helpers';

export function createGetObjectStore(storeName: string): ts.Statement {
  return createConstStatement(
    ts.factory.createIdentifier('store'),
    undefined,
    ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier('tx'),
        ts.factory.createIdentifier('objectStore'),
      ),
      undefined,
      [ts.factory.createStringLiteral(storeName)],
    ),
  );
}
