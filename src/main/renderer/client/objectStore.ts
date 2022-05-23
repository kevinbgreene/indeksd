import * as ts from 'typescript';
import { createConstStatement } from '../helpers';
import { COMMON_IDENTIFIERS } from '../identifiers';

export function createGetObjectStore(storeName: string): ts.Statement {
  return createConstStatement(
    COMMON_IDENTIFIERS.store,
    undefined,
    ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.tx,
        COMMON_IDENTIFIERS.objectStore,
      ),
      undefined,
      [ts.factory.createStringLiteral(storeName)],
    ),
  );
}
