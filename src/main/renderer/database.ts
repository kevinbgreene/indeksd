import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import {
  DatabaseDefinition,
  FieldDefinition,
  TableDefinition,
} from '../parser';
import {
  createClientFunction,
  createClientTypeDeclaration,
  createClientTypeNode,
} from './client';
import { createGetArgsType } from './client/getMethod';
import { createConstStatement, createParameterDeclaration } from './helpers';
import { autoincrementFieldsForTable } from './keys';
import { createBooleanLiteral } from './types';

export function renderDatabaseDefinition(
  def: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  return [
    ...def.body.map((next) => {
      return createGetArgsType(next);
    }),
    createClientTypeDeclaration(def),
    createClientFunction(def),
    ts.factory.createFunctionDeclaration(
      undefined,
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      undefined,
      ts.factory.createIdentifier('init'),
      undefined,
      [],
      ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
        createClientTypeNode(def),
      ]),
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
                    createParameterDeclaration(COMMON_IDENTIFIERS.resolve),
                    createParameterDeclaration(COMMON_IDENTIFIERS.reject),
                  ],
                  undefined,
                  undefined,
                  ts.factory.createBlock(
                    [
                      createConstStatement(
                        COMMON_IDENTIFIERS.DBOpenRequest,
                        undefined,
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
                            COMMON_IDENTIFIERS.reject,
                            undefined,
                            [
                              ts.factory.createStringLiteral(
                                `Error opening database: ${def.name.value}`,
                              ),
                            ],
                          ),
                        ),
                      ]),
                      createEventHandler('onsuccess', [
                        createDbAssignment(),
                        createCallToCreateClient(),
                      ]),
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

function createCallToCreateClient(): ts.ExpressionStatement {
  return ts.factory.createExpressionStatement(
    ts.factory.createCallExpression(COMMON_IDENTIFIERS.resolve, undefined, [
      ts.factory.createCallExpression(
        ts.factory.createIdentifier('createDatabaseClient'),
        undefined,
        [ts.factory.createIdentifier('db')],
      ),
    ]),
  );
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
      undefined,
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

function createDbAssignment(): ts.Statement {
  return createConstStatement(
    ts.factory.createIdentifier('db'),
    undefined,
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
