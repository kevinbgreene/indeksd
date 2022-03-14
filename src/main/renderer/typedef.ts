import * as ts from 'typescript';
import { TypeNode, TypeDefinition } from '../parser';
import { typeForTypeNode } from './types';

export function renderTypeDefinition(def: TypeDefinition): ts.Statement {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(def.name.value),
    undefined,
    ts.factory.createUnionTypeNode([
      ...def.body.map((next: TypeNode) => {
        return typeForTypeNode(next);
      }),
    ]),
  );
}
