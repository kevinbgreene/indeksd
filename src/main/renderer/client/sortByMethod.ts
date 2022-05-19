import * as ts from 'typescript';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { createNewPromiseWithBody } from '../helpers';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { getJoinsForTable } from '../joins';
import { getIndexesForTableAsArray, isPrimaryKey } from '../keys';
import { createDefaultClauseForIndexHandling } from './common';
import {
  createDBGetRequestVariable,
  createGetMethodReturnTypeForTable,
  createHandlingForGetByIndex,
  createHandlingForGetByPrimaryKey,
  createOptionsParamForGetMethod,
  createSafeHandlingForRequest,
  WithJoins,
} from './getMethod';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { createIndexesTypeReferenceForTable } from './type';

function createSortByMethodSignature({
  table,
  withJoins,
}: {
  table: TableDefinition;
  withJoins: WithJoins;
}): ts.MethodSignature {
  return ts.factory.createMethodSignature(
    undefined,
    COMMON_IDENTIFIERS.sortBy,
    undefined,
    [],
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.indexName,
        undefined,
        createIndexesTypeReferenceForTable(table),
      ),
      createOptionsParamForGetMethod({ withJoins, withCount: true }),
    ],
    createGetMethodReturnTypeForTable({
      table,
      asUnion: withJoins === 'default',
      withJoins: withJoins === 'true' || withJoins === 'default',
      asArray: true,
    }),
  );
}

export function createSortByMethodSignaturesForTable(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.MethodSignature> {
  const joins = getJoinsForTable(table, database);

  if (joins.length > 0) {
    return [
      createSortByMethodSignature({ table, withJoins: 'true' }),
      createSortByMethodSignature({ table, withJoins: 'false' }),
      createSortByMethodSignature({ table, withJoins: 'default' }),
    ];
  } else {
    return [createSortByMethodSignature({ table, withJoins: 'none' })];
  }
}

function createSortByMethodDeclaration({
  table,
  withJoins,
  methodBody,
}: {
  table: TableDefinition;
  withJoins: WithJoins;
  methodBody?: ts.Block;
}): ts.MethodDeclaration {
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.sortBy,
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.indexName,
        undefined,
        createIndexesTypeReferenceForTable(table),
      ),
      createOptionsParamForGetMethod({ withJoins, withCount: true }),
    ],
    createGetMethodReturnTypeForTable({
      table,
      asUnion: withJoins === 'default',
      withJoins: withJoins === 'true' || withJoins === 'default',
      asArray: true,
    }),
    methodBody,
  );
}

function createSortByMethodDeclarations({
  table,
  database,
  methodBody,
}: {
  table: TableDefinition;
  database: DatabaseDefinition;
  methodBody: ts.Block;
}): ReadonlyArray<ts.MethodDeclaration> {
  const joins = getJoinsForTable(table, database);

  if (joins.length > 0) {
    return [
      createSortByMethodDeclaration({
        table,
        withJoins: 'true',
      }),
      createSortByMethodDeclaration({
        table,
        withJoins: 'false',
      }),
      createSortByMethodDeclaration({
        table,
        withJoins: 'default',
        methodBody,
      }),
    ];
  } else {
    return [
      createSortByMethodDeclaration({
        table,
        withJoins: 'false',
        methodBody,
      }),
    ];
  }
}

export function createSortByMethod(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.MethodDeclaration> {
  return createSortByMethodDeclarations({
    table,
    database,
    methodBody: ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          createNewPromiseWithBody(
            undefined,
            undefined,
            ts.factory.createBlock(
              [
                createTransactionWithMode({
                  table,
                  database,
                  mode: 'readonly',
                  withJoins: true,
                }),
                createGetObjectStore(table.name.value),
                createDBGetRequestVariable(),
                ...createIndexHandling(table),
                createSafeHandlingForRequest({
                  table,
                  database,
                  methodName: 'getAll',
                }),
              ],
              true,
            ),
          ),
        ),
      ],
      true,
    ),
  });
}

function createIndexHandling(
  table: TableDefinition,
): ReadonlyArray<ts.Statement> {
  const indexes = getIndexesForTableAsArray(table);
  const argumentsArray = [
    COMMON_IDENTIFIERS.undefined,
    ts.factory.createPropertyAccessChain(
      COMMON_IDENTIFIERS.options,
      ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
      COMMON_IDENTIFIERS.count,
    ),
  ];

  return [
    ts.factory.createSwitchStatement(
      COMMON_IDENTIFIERS.indexName,
      ts.factory.createCaseBlock([
        ...indexes.map((next) => {
          return ts.factory.createCaseClause(
            ts.factory.createStringLiteral(next.name),
            [
              ts.factory.createBlock(
                [
                  ...(isPrimaryKey(next)
                    ? createHandlingForGetByPrimaryKey({
                        methodName: 'getAll',
                        argumentsArray,
                      })
                    : createHandlingForGetByIndex({
                        tableIndex: next,
                        methodName: 'getAll',
                        argumentsArray,
                      })),
                  ts.factory.createBreakStatement(),
                ],
                true,
              ),
            ],
          );
        }),
        createDefaultClauseForIndexHandling(),
      ]),
    ),
  ];
}
