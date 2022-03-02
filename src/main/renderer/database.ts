import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import {
  DatabaseDefinition,
  FieldDefinition,
  TableDefinition,
} from '../parser';
import { createBooleanLiteral } from './types';

export function renderDatabaseDefinition(
  def: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  return [
    createClientFunction(),
    ts.factory.createFunctionDeclaration(
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
                        ...createObjectStores(def),
                        ...createObjectStoreIndexes(def),
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
    ),
  ];
}

function identifierForObjectStore(def: TableDefinition): ts.Identifier {
  return ts.factory.createIdentifier(`${def.name.value}Store`);
}

function createObjectStores(
  def: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  return def.body.map((next) => {
    return createConstStatement(
      identifierForObjectStore(next),
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier('db'),
          ts.factory.createIdentifier('createObjectStore'),
        ),
        undefined,
        [
          ts.factory.createStringLiteral(next.name.value),
          createOptionsForObjectStore(next),
        ],
      ),
    );
  });
}

function createOptionsForObjectStore(
  def: TableDefinition,
): ts.ObjectLiteralExpression {
  const autoincrementFields = autoincrementFieldsForTable(def);
  if (autoincrementFields.length > 1) {
    throw new Error(
      `Only one field can be set as autoincrement but found ${autoincrementFields.length} in ${def.name.value}`,
    );
  }
  return ts.factory.createObjectLiteralExpression(
    autoincrementFields.map((next) => {
      return ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier('keyPath'),
        ts.factory.createStringLiteral(next.name.value),
      );
    }),
  );
}

function autoincrementFieldsForTable(
  def: TableDefinition,
): ReadonlyArray<FieldDefinition> {
  console.log(def);
  return def.body.filter(
    (next) => next.annotation?.name.value === 'autoincrement',
  );
}

function createObjectStoreIndexes(
  def: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  return def.body.flatMap((next) => {
    return createIndexesForStore(next);
  });
}

function createIndexesForStore(
  def: TableDefinition,
): ReadonlyArray<ts.Statement> {
  const indexes = indexFieldsForTable(def);
  return indexes.map((next) => {
    return ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(
        ts.factory.createPropertyAccessExpression(
          identifierForObjectStore(def),
          'createIndex',
        ),
        undefined,
        [
          ts.factory.createStringLiteral(next.name.value),
          ts.factory.createStringLiteral(next.name.value),
          optionsForIndex(next),
        ],
      ),
    );
  });
}

function optionsForIndex(def: FieldDefinition): ts.ObjectLiteralExpression {
  const isFieldUnique = def.annotation?.name.value === 'unique';
  return ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier('unique'),
      createBooleanLiteral(isFieldUnique),
    ),
  ]);
}

function indexFieldsForTable(
  def: TableDefinition,
): ReadonlyArray<FieldDefinition> {
  return def.body.filter((next) => next.annotation?.name.value === 'index');
}

function createClientFunction(): ts.Statement {
  return ts.factory.createFunctionDeclaration(
    undefined,
    undefined,
    undefined,
    ts.factory.createIdentifier('createDatabaseClient'),
    undefined,
    [], // args
    undefined, // return type
    ts.factory.createBlock([], true),
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
