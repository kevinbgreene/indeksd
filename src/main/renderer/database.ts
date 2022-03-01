import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { DatabaseDefinition } from '../parser';

export function renderDatabaseDefinition(
  def: DatabaseDefinition,
): ts.Statement {
  return ts.factory.createFunctionDeclaration(
    undefined,
    undefined,
    undefined,
    ts.factory.createIdentifier('init'),
    undefined,
    [],
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise),
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          ts.factory.createNewExpression(
            COMMON_IDENTIFIERS.Promise,
            undefined,
            [
              ts.factory.createArrowFunction(
                undefined,
                undefined,
                [
                  createParameterDeclaration(
                    ts.factory.createIdentifier('resolve'),
                  ),
                  createParameterDeclaration(
                    ts.factory.createIdentifier('reject'),
                  ),
                ],
                undefined,
                undefined,
                ts.factory.createBlock(
                  [
                    createConstStatement(
                      COMMON_IDENTIFIERS.DBOpenRequest,
                      ts.factory.createCallExpression(
                        ts.factory.createPropertyAccessExpression(
                          COMMON_IDENTIFIERS.globalThis,
                          'open',
                        ),
                        undefined,
                        [ts.factory.createStringLiteral(def.name.value)],
                      ),
                    ),
                    createEventHandler('onerror', [
                      ts.factory.createExpressionStatement(
                        ts.factory.createCallExpression(
                          ts.factory.createIdentifier('reject'),
                          undefined,
                          [
                            ts.factory.createStringLiteral(
                              `Error opening database: ${def.name.value}`,
                            ),
                          ],
                        ),
                      ),
                    ]),
                    createEventHandler('onsuccess', [createDbAssignment()]),
                    createEventHandler('onupgradeneeded', [
                      createDbAssignment(),
                    ]),
                  ],
                  true,
                ),
              ),
            ],
          ),
        ),
      ],
      true,
    ),
  );
}

function createConstStatement(
  variableName: ts.Identifier,
  initializer: ts.Expression,
): ts.Statement {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          variableName,
          undefined,
          undefined,
          initializer,
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );
}

function createDbAssignment(): ts.Statement {
  return createConstStatement(
    ts.factory.createIdentifier('db'),
    ts.factory.createPropertyAccessExpression(
      COMMON_IDENTIFIERS.DBOpenRequest,
      ts.factory.createIdentifier('result'),
    ),
  );
}

function createEventHandler(
  eventName: string,
  eventStatements: ReadonlyArray<ts.Statement>,
): ts.ExpressionStatement {
  return ts.factory.createExpressionStatement(
    ts.factory.createAssignment(
      ts.factory.createPropertyAccessExpression(
        COMMON_IDENTIFIERS.DBOpenRequest,
        eventName,
      ),
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [createParameterDeclaration(COMMON_IDENTIFIERS.event)],
        undefined,
        undefined,
        ts.factory.createBlock(eventStatements, true),
      ),
    ),
  );
}

function createParameterDeclaration(
  name: ts.Identifier,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    name,
    undefined,
    undefined,
    undefined,
  );
}
