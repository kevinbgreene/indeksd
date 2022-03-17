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
import { createGetArgsType, createIndexPredicates } from './client/getMethod';
import { getItemNameForTable } from './client/type';
import {
  createConstStatement,
  createNewPromiseWithBody,
  createParameterDeclaration,
} from './helpers';
import {
  annotationsFromList,
  getPrimaryKeyFieldForTable,
  getIndexFieldsForTable,
  isAutoIncrementField,
} from './keys';
import { createBooleanLiteral, typeForTypeNode } from './types';

function createItemTypeForTable(def: TableDefinition): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    getItemNameForTable(def),
    undefined,
    ts.factory.createTypeLiteralNode(
      def.body.map((next) => {
        return ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(next.name.value),
          undefined,
          typeForTypeNode(next.type),
        );
      }),
    ),
  );
}

export function renderDatabaseDefinition(
  def: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  return [
    ...def.body.map((next) => {
      return createItemTypeForTable(next);
    }),
    ...def.body.map((next) => {
      return createGetArgsType(next);
    }),
    ...def.body.flatMap((next) => {
      return createIndexPredicates(next);
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
            createNewPromiseWithBody(
              ts.factory.createBlock(
                [
                  createConstStatement(
                    COMMON_IDENTIFIERS.DBOpenRequest,
                    undefined,
                    ts.factory.createCallExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createPropertyAccessExpression(
                          COMMON_IDENTIFIERS.globalThis,
                          'indexedDB',
                        ),
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
  const primaryKeyField = getPrimaryKeyFieldForTable(def);
  const options = [
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier('keyPath'),
      ts.factory.createStringLiteral(primaryKeyField.name.value),
    ),
  ];

  if (isAutoIncrementField(primaryKeyField)) {
    options.push(
      ts.factory.createPropertyAssignment(
        ts.factory.createIdentifier('autoIncrement'),
        ts.factory.createTrue(),
      ),
    );
  }

  return ts.factory.createObjectLiteralExpression(options);
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
  const indexes = getIndexFieldsForTable(def);
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
  const isFieldUnique =
    annotationsFromList(def.annotations, ['unique']) != null;
  return ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier('unique'),
      createBooleanLiteral(isFieldUnique),
    ),
  ]);
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
