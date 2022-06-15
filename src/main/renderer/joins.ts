import * as ts from 'typescript';
import {
  DatabaseDefinition,
  FieldDefinition,
  TableDefinition,
  TypeNode,
} from '../parser';
import { definitionForIdentifier } from '../resolver';
import { getItemNameForTable } from './common';
import { getPrimaryKeyFieldForTable } from './keys';
import { typeForTypeNode } from './types';

export function getItemNameWithJoinsForTable(table: TableDefinition): string {
  return `${getItemNameForTable(table)}WithJoins`;
}

export type TableJoin = Readonly<{
  table: TableDefinition;
  required: boolean;
  fieldName: string;
}>;

export function getJoinsForTable(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<TableJoin> {
  const result: Array<TableJoin> = [];
  for (const field of table.body) {
    if (field.type.kind === 'TypeReferenceNode') {
      const def = definitionForIdentifier(field.type.name, database.body);
      if (def?.kind === 'TableDefinition') {
        result.push({
          table: def,
          required: field.required,
          fieldName: field.name.value,
        });
      }
    }
  }
  return result;
}

function isFieldOptional(field: FieldDefinition): boolean {
  return field.required === false && field.defaultValue == null;
}

export function createItemTypeWithJoinsForTable(
  table: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.TypeAliasDeclaration> {
  const joins = getJoinsForTable(table, database);

  const typeAliases = [
    ts.factory.createTypeAliasDeclaration(
      undefined,
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      getItemNameForTable(table),
      undefined,
      ts.factory.createTypeLiteralNode(
        table.body.map((field) => {
          return ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(field.name.value),
            isFieldOptional(field) == false
              ? undefined
              : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
            typeNodeResolvingPrimaryKeys(field.type, database),
          );
        }),
      ),
    ),
  ];

  if (joins.length > 0) {
    typeAliases.push(
      ts.factory.createTypeAliasDeclaration(
        undefined,
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier(getItemNameWithJoinsForTable(table)),
        undefined,
        ts.factory.createTypeLiteralNode(
          table.body.map((field) => {
            return ts.factory.createPropertySignature(
              undefined,
              ts.factory.createIdentifier(field.name.value),
              isFieldOptional(field) == false
                ? undefined
                : ts.factory.createToken(ts.SyntaxKind.QuestionToken),
              typeNodeResolvingJoins(field.type, database),
            );
          }),
        ),
      ),
    );
  }

  return typeAliases;
}

export function typeNodeResolvingPrimaryKeys(
  typeNode: TypeNode,
  database: DatabaseDefinition,
): ts.TypeNode {
  if (typeNode.kind === 'TypeReferenceNode') {
    const def = definitionForIdentifier(typeNode.name, database.body);
    if (def?.kind === 'TableDefinition') {
      const primaryKeyForReference = getPrimaryKeyFieldForTable(def);
      return typeForTypeNode(primaryKeyForReference.type);
    }
  }

  return typeForTypeNode(typeNode);
}

export function typeNodeResolvingJoins(
  typeNode: TypeNode,
  database: DatabaseDefinition,
): ts.TypeNode {
  if (typeNode.kind === 'TypeReferenceNode') {
    const def = definitionForIdentifier(typeNode.name, database.body);
    if (def?.kind === 'TableDefinition') {
      const joinsForReference = getJoinsForTable(def, database);
      if (joinsForReference.length > 0) {
        return ts.factory.createTypeReferenceNode(
          getItemNameWithJoinsForTable(def),
        );
      } else {
        return ts.factory.createTypeReferenceNode(getItemNameForTable(def));
      }
    }
  }

  return typeForTypeNode(typeNode);
}
