import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { DatabaseDefinition } from '../../parser';
import { createParameterDeclaration } from '../helpers';
import { capitalize } from '../utils';

export function createDatabaseClientName(def: DatabaseDefinition): string {
  return `${capitalize(def.name.value)}Client`;
}

export function createClientTypeNode(def: DatabaseDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(createDatabaseClientName(def));
}

export function createOnErrorHandler(
  methodName: string,
  requestTypeArgs: ReadonlyArray<ts.TypeNode>,
): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier(methodName),
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
                [
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createAsExpression(
                      ts.factory.createIdentifier(methodName),
                      ts.factory.createTypeReferenceNode(
                        COMMON_IDENTIFIERS.IDBRequest,
                        requestTypeArgs,
                      ),
                    ),
                    'error',
                  ),
                ],
              ),
            ),
          ],
          true,
        ),
      ),
    ),
  );
}

export function createOnSuccessHandler(
  methodName: string,
  requestTypeArgs: ReadonlyArray<ts.TypeNode> = [],
): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier(methodName),
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
                [
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createAsExpression(
                      ts.factory.createIdentifier(methodName),
                      ts.factory.createTypeReferenceNode(
                        COMMON_IDENTIFIERS.IDBRequest,
                        requestTypeArgs,
                      ),
                    ),
                    'result',
                  ),
                ],
              ),
            ),
          ],
          true,
        ),
      ),
    ),
  );
}
