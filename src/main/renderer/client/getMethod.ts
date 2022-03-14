import * as ts from 'typescript';
import { TableDefinition } from '../../parser';
import { getIndexesForTable } from '../keys';
import { createStringType, typeForTypeNode } from '../types';
import { capitalize } from '../utils';

export function createGetArgsTypeName(def: TableDefinition): string {
  return `${capitalize(def.name.value)}GetArgs`;
}

export function createGetArgsType(
  def: TableDefinition,
): ts.TypeAliasDeclaration {
  const indexes = getIndexesForTable(def);

  return ts.factory.createTypeAliasDeclaration(
    undefined,
    undefined,
    ts.factory.createIdentifier(createGetArgsTypeName(def)),
    [],
    ts.factory.createUnionTypeNode(
      indexes.map((next) => {
        switch (next.indexKind) {
          case 'autoincrement':
            return createStringType();
          case 'index':
            return ts.factory.createTypeLiteralNode([
              ts.factory.createPropertySignature(
                undefined,
                ts.factory.createIdentifier(next.name),
                undefined,
                typeForTypeNode(next.type),
              ),
            ]);
          default:
            const _exhaustiveCheck: never = next.indexKind;
            throw new Error(
              `Non-exhaustive check for index kind ${_exhaustiveCheck}`,
            );
        }
      }),
    ),
  );
}
