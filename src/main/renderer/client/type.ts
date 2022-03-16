import * as ts from 'typescript';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { getAnnotationsByName } from '../keys';
import { capitalize } from '../utils';
import { createAddMethodTypeNode } from './addMethod';
import { createDatabaseClientName } from './common';
import { createGetMethodTypeNode } from './getMethod';

export function createClientTypeDeclaration(
  def: DatabaseDefinition,
): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(createDatabaseClientName(def)),
    undefined,
    ts.factory.createTypeLiteralNode(
      def.body.map((next) => {
        return ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(next.name.value.toLowerCase()),
          undefined,
          ts.factory.createTypeLiteralNode([
            ts.factory.createPropertySignature(
              undefined,
              ts.factory.createIdentifier('add'),
              undefined,
              createAddMethodTypeNode(next),
            ),
            ts.factory.createPropertySignature(
              undefined,
              ts.factory.createIdentifier('get'),
              undefined,
              createGetMethodTypeNode(next),
            ),
          ]),
        );
      }),
    ),
  );
}

export function getItemNameForTable(def: TableDefinition): string {
  const itemAnnotations = getAnnotationsByName(def.annotations, 'item');
  if (itemAnnotations.length > 1) {
    throw new Error('Table can only include one annotation for "item"');
  }

  const itemArguments = itemAnnotations[0]?.arguments;
  if (itemArguments && itemArguments.length > 1) {
    throw new Error('Table can only include one name alias');
  }

  if (itemArguments && itemArguments.length > 0) {
    return itemArguments[0]?.value;
  }

  return capitalize(def.name.value);
}
