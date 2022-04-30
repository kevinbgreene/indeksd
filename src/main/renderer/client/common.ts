import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { capitalize } from '../utils';

export function clientTypeNameForTable(def: TableDefinition): string {
  return `${capitalize(def.name.value)}Client`;
}

export function clientClassNameForTable(def: TableDefinition): string {
  return `${capitalize(def.name.value)}ClientImpl`;
}

export function clientVariableNameForTable(def: TableDefinition): string {
  return `${def.name.value.toLowerCase()}Client`;
}

export function createDatabaseClientName(def: DatabaseDefinition): string {
  return `${capitalize(def.name.value)}Client`;
}

export function createClientTypeNode(def: DatabaseDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(createDatabaseClientName(def));
}

export function createOnErrorHandler(
  methodName: ts.Identifier,
  requestTypeArgs: ReadonlyArray<ts.TypeNode>,
): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        methodName,
        COMMON_IDENTIFIERS.onerror,
      ),
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [], // params
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
                      methodName,
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
  methodName: ts.Identifier,
  requestTypeArgs: ReadonlyArray<ts.TypeNode> = [],
): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        methodName,
        COMMON_IDENTIFIERS.onsuccess,
      ),
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [], // params
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
                      methodName,
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
