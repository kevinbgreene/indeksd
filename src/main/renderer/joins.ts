import * as ts from 'typescript';
import { DatabaseDefinition, TableDefinition, TypeNode } from '../parser';
import { definitionForIdentifier } from '../resolver';
import { getItemNameForTable } from './common';
import { getPrimaryKeyFieldForTable } from './keys';
import { typeForTypeNode } from './types';

export function getItemNameWithJoinsForTable(table: TableDefinition): string {
  return `${getItemNameForTable(table)}WithJoins`;
}

export type TableJoin = Readonly<{
  table: TableDefinition;
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
          fieldName: field.name.value,
        });
      }
    }
  }
  return result;
}

export function createItemTypeWithJoinsForTable(
  def: TableDefinition,
  database: DatabaseDefinition,
): ReadonlyArray<ts.TypeAliasDeclaration> {
  const joins = getJoinsForTable(def, database);

  const typeAliases = [
    ts.factory.createTypeAliasDeclaration(
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
            typeNodeResolvingPrimaryKeys(next.type, database),
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
        ts.factory.createIdentifier(getItemNameWithJoinsForTable(def)),
        undefined,
        ts.factory.createTypeLiteralNode(
          def.body.map((next) => {
            return ts.factory.createPropertySignature(
              undefined,
              ts.factory.createIdentifier(next.name.value),
              undefined,
              typeNodeResolvingJoins(next.type, database),
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
