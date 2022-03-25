import * as ts from 'typescript';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { createConstStatement } from '../helpers';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { getJoinsForTable } from '../joins';
import { createStringType } from '../types';
import { createAddMethod } from './addMethod';
import {
  clientVariableNameForTable,
  createClientTypeNode,
  clientClassNameForTable,
} from './common';
import { createGetMethod } from './getMethod';

export { createClientTypeDeclaration } from './type';
export { createClientTypeNode } from './common';

function createClientDeclarationForTable(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  const clientClassName = ts.factory.createIdentifier(
    clientClassNameForTable(table),
  );
  const clientVariableName = ts.factory.createIdentifier(
    clientVariableNameForTable(table),
  );
  return [
    ts.factory.createClassDeclaration(
      undefined,
      undefined,
      clientClassName,
      undefined,
      undefined,
      [
        createTablesStaticArray(table, database),
        createAddMethod(table, database),
        ...createGetMethod({ table, database, methodName: 'get' }),
        ...createGetMethod({ table, database, methodName: 'getAll' }),
      ],
    ),
    createConstStatement(
      clientVariableName,
      undefined,
      ts.factory.createNewExpression(clientClassName, undefined, []),
    ),
  ];
}

function createTablesStaticArray(
  def: TableDefinition,
  database: DatabaseDefinition,
): ts.PropertyDeclaration {
  const joins = getJoinsForTable(def, database);
  const transactionTables = [def.name.value];

  joins.forEach((next) => {
    transactionTables.push(next.table.name.value);
  });

  return ts.factory.createPropertyDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.StaticKeyword)],
    ts.factory.createIdentifier('tablesForTransaction'),
    undefined,
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.ReadonlyArray, [
      createStringType(),
    ]),
    ts.factory.createArrayLiteralExpression(
      transactionTables.map((next) => {
        return ts.factory.createStringLiteral(next);
      }),
    ),
  );
}

export function createClientFunction(
  database: DatabaseDefinition,
): ts.Statement {
  return ts.factory.createFunctionDeclaration(
    undefined,
    undefined,
    undefined,
    ts.factory.createIdentifier('createDatabaseClient'),
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.db,
        undefined,
        ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBDatabase),
      ),
    ], // args
    createClientTypeNode(database), // return type
    ts.factory.createBlock(
      [
        ...database.body.flatMap((table) => {
          return createClientDeclarationForTable(table, database);
        }),
        ts.factory.createReturnStatement(
          ts.factory.createObjectLiteralExpression(
            database.body.map((table) => {
              return ts.factory.createPropertyAssignment(
                table.name.value.toLowerCase(),
                ts.factory.createIdentifier(clientVariableNameForTable(table)),
              );
            }),
            true,
          ),
        ),
      ],
      true,
    ),
  );
}
