import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../../identifiers';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { getAnnotationsByName } from '../keys';
import { createVoidType } from '../types';
import { capitalize } from '../utils';
import { createDatabaseClientName } from './common';

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
          ]),
        );
      }),
    ),
  );
}

function createAddMethodTypeNode(def: TableDefinition): ts.TypeNode {
  return ts.factory.createFunctionTypeNode(
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        'arg',
        undefined,
        ts.factory.createTypeReferenceNode(getItemNameForTable(def), undefined),
      ),
    ],
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
      createVoidType(),
    ]),
  );
}

export function getItemNameForTable(def: TableDefinition): string {
  const itemAnnotations = getAnnotationsByName(def.annotations, 'item');
  console.log({ itemAnnotations });
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
