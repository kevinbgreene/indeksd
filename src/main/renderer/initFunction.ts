import * as ts from 'typescript';
import {
  DatabaseDefinition,
  FieldDefinition,
  TableDefinition,
} from '../parser';
import { createClientTypeNode } from './client';
import {
  createConstStatement,
  createNewErrorWithMessage,
  createNewPromiseWithBody,
} from './helpers';
import { COMMON_IDENTIFIERS } from './identifiers';
import {
  annotationsFromList,
  getIndexesForTable,
  getIndexFieldsForTable,
  getPrimaryKeyFieldForTable,
  isAutoIncrementField,
} from './keys';
import {
  createArrayType,
  createBooleanLiteral,
  createStringType,
  createVoidType,
} from './types/baseTypes';

export function createInitFunctionDeclaration(
  database: DatabaseDefinition,
): ts.FunctionDeclaration {
  const version: number = database.annotations.reduce((_, next) => {
    if (next.name.value === 'version') {
      if (next.arguments.length === 1) {
        const argument = next.arguments[0];
        if (argument.kind === 'IntegerLiteral') {
          return parseInt(argument.value);
        } else {
          throw new Error(
            `The "version" annotation only accepts integer arguments but found: ${argument.kind}`,
          );
        }
      } else {
        throw new Error(
          `The "version" annotation expects one argument but found: ${next.arguments.length}`,
        );
      }
    } else {
      throw new Error(
        `Database only supports the "version" annotation but found: ${next.name.value}`,
      );
    }
  }, 1);

  return ts.factory.createFunctionDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    undefined,
    COMMON_IDENTIFIERS.init,
    undefined,
    [],
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
      createClientTypeNode(database),
    ]),
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          createNewPromiseWithBody(
            undefined,
            undefined,
            ts.factory.createBlock(
              [
                createCreateObjectStoreFunctionDeclaration(),
                createCreateIndexFunctionDeclaration(),
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
                    [
                      ts.factory.createStringLiteral(database.name.value),
                      ts.factory.createNumericLiteral(version),
                    ],
                  ),
                ),
                createEventHandler('onerror', [
                  ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                      COMMON_IDENTIFIERS.reject,
                      undefined,
                      [
                        createNewErrorWithMessage(
                          `Error opening database: ${database.name.value}`,
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
                  ...createCreateObjectStoresCall(database),
                  ...createObjectStoreIndexes(database),
                ]),
              ],
              true,
            ),
          ),
        ),
      ],
      true,
    ),
  );
}

function createCallToCreateClient(): ts.ExpressionStatement {
  return ts.factory.createExpressionStatement(
    ts.factory.createCallExpression(COMMON_IDENTIFIERS.resolve, undefined, [
      ts.factory.createCallExpression(
        COMMON_IDENTIFIERS.createDatabaseClient,
        undefined,
        [COMMON_IDENTIFIERS.db],
      ),
    ]),
  );
}

function createCreateObjectStoresCall(
  def: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  return def.body.map((next) => {
    const indexesForTable = getIndexFieldsForTable(next);
    const objectStore = ts.factory.createCallExpression(
      COMMON_IDENTIFIERS.createObjectStore,
      undefined,
      [
        COMMON_IDENTIFIERS.db,
        ts.factory.createStringLiteral(next.name.value),
        createOptionsForObjectStore(next),
      ],
    );

    return indexesForTable.length > 0
      ? createConstStatement(
          identifierForObjectStore(next),
          undefined,
          objectStore,
        )
      : ts.factory.createExpressionStatement(objectStore);
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

function identifierForObjectStore(def: TableDefinition): ts.Identifier {
  return ts.factory.createIdentifier(`${def.name.value}Store`);
}

function createIndexesForStore(
  def: TableDefinition,
): ReadonlyArray<ts.Statement> {
  const tableIndexes = getIndexesForTable(def);
  return tableIndexes.indexes.map((next) => {
    return ts.factory.createExpressionStatement(
      ts.factory.createCallExpression(
        COMMON_IDENTIFIERS.createIndex,
        undefined,
        [
          identifierForObjectStore(def),
          ts.factory.createStringLiteral(next.name),
          ts.factory.createArrayLiteralExpression(
            next.fields.map((next) => {
              return ts.factory.createStringLiteral(next.name.value);
            }),
          ),
          optionsForIndex(next.fields),
        ],
      ),
    );
  });
}

function optionsForIndex(
  defs: ReadonlyArray<FieldDefinition>,
): ts.ObjectLiteralExpression {
  const isFieldUnique = defs.every(
    (next) => annotationsFromList(next.annotations, ['unique']) != null,
  );
  return ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier('unique'),
      createBooleanLiteral(isFieldUnique),
    ),
  ]);
}

function createDbAssignment(): ts.Statement {
  return createConstStatement(
    COMMON_IDENTIFIERS.db,
    undefined,
    ts.factory.createPropertyAccessExpression(
      COMMON_IDENTIFIERS.DBOpenRequest,
      COMMON_IDENTIFIERS.result,
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
        [], // params
        undefined,
        undefined,
        ts.factory.createBlock(eventStatements, true),
      ),
    ),
  );
}

function createCreateObjectStoreFunctionDeclaration(): ts.FunctionDeclaration {
  return ts.factory.createFunctionDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.createObjectStore,
    [],
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.db,
        undefined,
        ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBDatabase),
      ),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.storeName,
        undefined,
        createStringType(),
      ),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.options,
        undefined,
        ts.factory.createTypeReferenceNode(
          COMMON_IDENTIFIERS.IDBObjectStoreParameters,
        ),
      ),
    ],
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBObjectStore),
    ts.factory.createBlock(
      [
        ts.factory.createIfStatement(
          ts.factory.createBinaryExpression(
            ts.factory.createPropertyAccessExpression(
              COMMON_IDENTIFIERS.DBOpenRequest,
              COMMON_IDENTIFIERS.transaction,
            ),
            ts.SyntaxKind.EqualsEqualsToken,
            ts.factory.createNull(),
          ),
          ts.factory.createBlock(
            [
              ts.factory.createThrowStatement(
                createNewErrorWithMessage(
                  'Error opening database. Open request transaction is null.',
                ),
              ),
            ],
            true,
          ),
        ),
        ts.factory.createIfStatement(
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createPropertyAccessExpression(
                COMMON_IDENTIFIERS.db,
                COMMON_IDENTIFIERS.objectStoreNames,
              ),
              COMMON_IDENTIFIERS.contains,
            ),
            undefined,
            [COMMON_IDENTIFIERS.storeName],
          ),
          ts.factory.createBlock(
            [
              ts.factory.createReturnStatement(
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createPropertyAccessExpression(
                      COMMON_IDENTIFIERS.DBOpenRequest,
                      COMMON_IDENTIFIERS.transaction,
                    ),
                    COMMON_IDENTIFIERS.objectStore,
                  ),
                  undefined,
                  [COMMON_IDENTIFIERS.storeName],
                ),
              ),
            ],
            true,
          ),
          ts.factory.createBlock(
            [
              ts.factory.createReturnStatement(
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    COMMON_IDENTIFIERS.db,
                    COMMON_IDENTIFIERS.createObjectStore,
                  ),
                  undefined,
                  [COMMON_IDENTIFIERS.storeName, COMMON_IDENTIFIERS.options],
                ),
              ),
            ],
            true,
          ),
        ),
      ],
      true,
    ),
  );
}

function createCreateIndexFunctionDeclaration(): ts.FunctionDeclaration {
  return ts.factory.createFunctionDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.createIndex,
    [],
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.store,
        undefined,
        ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBObjectStore),
      ),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.indexName,
        undefined,
        createStringType(),
      ),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.keyPath,
        undefined,
        createArrayType(createStringType()),
      ),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.options,
        undefined,
        ts.factory.createTypeReferenceNode(
          COMMON_IDENTIFIERS.IDBIndexParameters,
        ),
      ),
    ],
    createVoidType(),
    ts.factory.createBlock(
      [
        ts.factory.createIfStatement(
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createPropertyAccessExpression(
                COMMON_IDENTIFIERS.store,
                COMMON_IDENTIFIERS.indexNames,
              ),
              COMMON_IDENTIFIERS.contains,
            ),
            undefined,
            [COMMON_IDENTIFIERS.indexName],
          ),
          ts.factory.createBlock([ts.factory.createReturnStatement()], true),
          ts.factory.createBlock(
            [
              ts.factory.createExpressionStatement(
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    COMMON_IDENTIFIERS.store,
                    COMMON_IDENTIFIERS.createIndex,
                  ),
                  undefined,
                  [
                    COMMON_IDENTIFIERS.indexName,
                    COMMON_IDENTIFIERS.keyPath,
                    COMMON_IDENTIFIERS.options,
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
  );
}
