import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { capitalize } from '../utils';
import { getPrimaryKeyFieldForTable } from '../keys';

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

export function createOnErrorHandler(methodName: ts.Identifier): ts.Statement {
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
            ts.factory.createIfStatement(
              ts.factory.createBinaryExpression(
                methodName,
                ts.SyntaxKind.ExclamationEqualsToken,
                ts.factory.createNull(),
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.reject,
                      undefined,
                      [
                        ts.factory.createPropertyAccessExpression(
                          methodName,
                          'error',
                        ),
                      ],
                    ),
                  ),
                ],
                true,
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.reject,
                      undefined,
                      [
                        ts.factory.createNewExpression(
                          COMMON_IDENTIFIERS.Error,
                          undefined,
                          [
                            ts.factory.createStringLiteral(
                              'Unknown error occurred trying to perform operation',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
                true,
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
  table: TableDefinition,
): ts.Statement {
  const primaryKeyField = getPrimaryKeyFieldForTable(table);

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
            ts.factory.createIfStatement(
              ts.factory.createBinaryExpression(
                methodName,
                ts.SyntaxKind.ExclamationEqualsToken,
                ts.factory.createNull(),
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.resolve,
                      undefined,
                      [
                        ts.factory.createObjectLiteralExpression(
                          [
                            ts.factory.createSpreadAssignment(
                              COMMON_IDENTIFIERS.arg,
                            ),
                            ts.factory.createPropertyAssignment(
                              primaryKeyField.name.value,
                              ts.factory.createPropertyAccessExpression(
                                methodName,
                                'result',
                              ),
                            ),
                          ],
                          true,
                        ),
                      ],
                    ),
                  ),
                ],
                true,
              ),
              ts.factory.createBlock(
                [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.reject,
                      undefined,
                      [
                        ts.factory.createNewExpression(
                          COMMON_IDENTIFIERS.Error,
                          undefined,
                          [
                            ts.factory.createStringLiteral(
                              'Operation produced a null result',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
                true,
              ),
            ),
          ],
          true,
        ),
      ),
    ),
  );
}
