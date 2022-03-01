import * as ts from 'typescript';
import { DatabaseDefinition, FieldType, TypeDefinition } from '../parser/types';
import { createVoidType, typeNodeForFieldType } from './types';

export function renderTypeDefinition(def: TypeDefinition): ts.Statement {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(def.name.value),
    undefined,
    ts.factory.createUnionTypeNode([
      ...def.body.map((next: FieldType) => {
        return typeNodeForFieldType(next);
      }),
    ]),
  );
}

export function renderDatabaseDefinition(
  def: DatabaseDefinition,
): ts.Statement {
  return ts.factory.createFunctionDeclaration(
    undefined,
    undefined,
    undefined,
    `make${def.name.value}`,
    undefined,
    [],
    createVoidType(),
    ts.factory.createBlock([], true),
  );
}
