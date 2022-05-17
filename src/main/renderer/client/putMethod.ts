import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import {
  DatabaseDefinition,
  FieldDefinition,
  TableDefinition,
} from '../../parser';
import { createNewPromiseWithBody } from '../helpers';
import { getPrimaryKeyTypeForTable } from '../keys';
import { capitalize } from '../utils';
import { createAddRequestHandling, createJoinHandling } from './common';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { createOptionsParameterDeclaration } from './type';
import { addMethodReturnType, createAddArgsTypeReference } from './addMethod';
import {
  getJoinsForTable,
  TableJoin,
  typeNodeResolvingPrimaryKeys,
} from '../joins';

export function createPutArgsTypeNameForTable(table: TableDefinition): string {
  return `${capitalize(table.name.value)}PutArgs`;
}

export function createPutArgsTypeReference(
  table: TableDefinition,
): ts.TypeReferenceNode {
  return ts.factory.createTypeReferenceNode(
    createPutArgsTypeNameForTable(table),
  );
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

export function createPutArgsTypeNode(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.TypeNode {
  const fields: Array<ts.TypeElement> = [];
  const joins = getJoinsForTable(table, database);

  for (const field of table.body) {
    const fieldJoin = joinForField(field, joins);
    if (fieldJoin && field.name.value === fieldJoin.fieldName) {
      fields.push(
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(field.name.value),
          field.required
            ? undefined
            : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          ts.factory.createUnionTypeNode([
            getPrimaryKeyTypeForTable(fieldJoin.table),
            ts.factory.createTypeReferenceNode(
              createPutArgsTypeNameForTable(fieldJoin.table),
            ),
          ]),
        ),
      );
    } else {
      fields.push(
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(field.name.value),
          field.required
            ? undefined
            : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
          typeNodeResolvingPrimaryKeys(field.type, database),
        ),
      );
    }
  }

  return ts.factory.createUnionTypeNode([
    createAddArgsTypeReference(table),
    ts.factory.createTypeLiteralNode([...fields]),
  ]);
}

export function createPutArgsTypeDeclaration(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(createPutArgsTypeNameForTable(table)),
    [],
    createPutArgsTypeNode(table, database),
  );
}

export function createArgsParamForPutMethod(
  table: TableDefinition,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.arg,
    undefined,
    ts.factory.createTypeReferenceNode(createPutArgsTypeNameForTable(table)),
  );
}

export function createPutMethod(
  table: TableDefinition,
  database: DatabaseDefinition,
): ts.MethodDeclaration {
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.put,
    undefined,
    undefined,
    [
      createArgsParamForPutMethod(table),
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
            undefined,
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
                ...createAddRequestHandling(table, database, 'put'),
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

export function createPutMethodSignatureForTable(
  table: TableDefinition,
): ts.MethodSignature {
  return ts.factory.createMethodSignature(
    undefined,
    COMMON_IDENTIFIERS.put,
    undefined,
    undefined,
    [
      createArgsParamForPutMethod(table),
      createOptionsParameterDeclaration({
        optional: true,
        includes: ['transaction'],
      }),
    ],
    addMethodReturnType(table),
  );
}
