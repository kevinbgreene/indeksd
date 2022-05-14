import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import {
  DatabaseDefinition,
  FieldDefinition,
  TableDefinition,
} from '../../parser';
import { createNewPromiseWithBody } from '../helpers';
import {
  getAutoIncrementFieldForTable,
  getPrimaryKeyTypeForTable,
} from '../keys';
import { capitalize } from '../utils';
import { createAddRequestHandling, createJoinHandling } from './common';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { createOptionsParameterDeclaration } from './type';
import { getItemNameForTable } from '../common';
import {
  getJoinsForTable,
  TableJoin,
  typeNodeResolvingPrimaryKeys,
} from '../joins';
import { createPutArgsTypeNameForTable } from './putMethod';

export function addMethodReturnType(table: TableDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
    ts.factory.createTypeReferenceNode(getItemNameForTable(table)),
  ]);
}

export function createAddArgsTypeName(table: TableDefinition): string {
  return `${capitalize(table.name.value)}AddArgs`;
}

export function createAddArgsTypeReference(
  table: TableDefinition,
): ts.TypeReferenceNode {
  return ts.factory.createTypeReferenceNode(createAddArgsTypeName(table));
}

function joinForField(
  field: FieldDefinition,
  joins: ReadonlyArray<TableJoin>,
): TableJoin | undefined {
  for (const join of joins) {
    if (field.name.value == join.fieldName) {
      return join;
    }
  }
}

export function createAddArgsTypeNode(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.TypeNode {
  const autoIncrementField = getAutoIncrementFieldForTable(table);
  const typeReferencNode = ts.factory.createTypeReferenceNode(
    getItemNameForTable(table),
  );

  const fields: Array<ts.TypeElement> = [];
  const joins = getJoinsForTable(table, database);

  for (const field of table.body) {
    if (
      autoIncrementField != null &&
      field.name.value === autoIncrementField.name.value
    ) {
      continue;
    } else {
      const fieldJoin = joinForField(field, joins);
      if (fieldJoin == null) {
        fields.push(
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(field.name.value),
            undefined,
            typeNodeResolvingPrimaryKeys(field.type, database),
          ),
        );
      } else {
        fields.push(
          ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(field.name.value),
            undefined,
            ts.factory.createUnionTypeNode([
              getPrimaryKeyTypeForTable(fieldJoin.table),
              ts.factory.createTypeReferenceNode(
                createPutArgsTypeNameForTable(fieldJoin.table),
              ),
            ]),
          ),
        );
      }
    }
  }

  return ts.factory.createUnionTypeNode([
    ts.factory.createTypeLiteralNode([...fields]),
  ]);
}

export function createAddArgsTypeDeclaration(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(createAddArgsTypeName(table)),
    [],
    createAddArgsTypeNode(table, database),
  );
}

export function createArgsParamForAddMethod(
  table: TableDefinition,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.arg,
    undefined,
    ts.factory.createTypeReferenceNode(createAddArgsTypeName(table)),
  );
}

export function createAddMethod(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.MethodDeclaration {
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.add,
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.arg,
        undefined,
        createAddArgsTypeReference(table),
      ),
      createOptionsParameterDeclaration({
        optional: true,
        includes: ['transaction'],
      }),
    ],
    addMethodReturnType(table),
    ts.factory.createBlock(
      [
        ts.factory.createReturnStatement(
          createNewPromiseWithBody(
            ts.factory.createToken(ts.SyntaxKind.AsyncKeyword),
            ts.factory.createBlock(
              [
                createTransactionWithMode({
                  table,
                  database,
                  mode: 'readwrite',
                  withJoins: false,
                }),
                createGetObjectStore(table.name.value),
                ...createJoinHandling(table, database),
                ...createAddRequestHandling(table, database, 'add'),
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

export function createAddMethodSignature(
  table: TableDefinition,
): ts.MethodSignature {
  return ts.factory.createMethodSignature(
    undefined,
    COMMON_IDENTIFIERS.add,
    undefined,
    undefined,
    [
      createArgsParamForAddMethod(table),
      createOptionsParameterDeclaration({
        optional: true,
        includes: ['transaction'],
      }),
    ],
    addMethodReturnType(table),
  );
}
