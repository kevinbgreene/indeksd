import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../../identifiers';
import { DatabaseDefinition, TableDefinition } from '../../parser';
import { createVoidType } from '../types';
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
        ts.factory.createTypeReferenceNode(def.name.value, undefined),
      ),
    ],
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
      createVoidType(),
    ]),
  );
}
