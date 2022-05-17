import * as ts from 'typescript';
import { DatabaseDefinition } from '../parser';
import { createClientFunction, createClientTypeDeclaration } from './client';
import { createAddArgsTypeDeclaration } from './client/addMethod';
import {
  createGetArgsTypeDeclaration,
  createIndexPredicates,
} from './client/getMethod';
import { createItemTypeWithJoinsForTable } from './joins';
import { createPutArgsTypeDeclaration } from './client/putMethod';
import { createIndexesTypeForTable } from './client/type';
import {
  createRangeQueryTypeDeclaration,
  createWhereQueryType,
} from './client/whereMethod';
import { createInitFunctionDeclaration } from './initFunction';

export function renderDatabaseDefinition(
  database: DatabaseDefinition,
): ReadonlyArray<ts.Statement> {
  return [
    ...database.body.flatMap((next) => {
      return createItemTypeWithJoinsForTable(next, database);
    }),
    ...database.body.map((next) => {
      return createIndexesTypeForTable(next);
    }),
    ...database.body.map((next) => {
      return createWhereQueryType(next, database);
    }),
    ...database.body.map((next) => {
      return createAddArgsTypeDeclaration(next, database);
    }),
    ...database.body.map((next) => {
      return createPutArgsTypeDeclaration(next, database);
    }),
    ...database.body.flatMap((next) => {
      return createGetArgsTypeDeclaration(next, database);
    }),
    ...database.body.flatMap((next) => {
      return createIndexPredicates(next, database);
    }),
    createRangeQueryTypeDeclaration(),
    ...createClientTypeDeclaration(database),
    createClientFunction(database),
    createInitFunctionDeclaration(database),
  ];
}
