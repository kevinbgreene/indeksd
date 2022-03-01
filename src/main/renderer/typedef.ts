import * as ts from 'typescript';
import { FieldType, TypeDefinition } from '../parser';
import { typeNodeForFieldType } from './types';

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
