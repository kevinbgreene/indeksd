import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';

export function createTypeProperty(
  name: string,
  type: ts.TypeNode,
): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined, // modifiers
    name, // name of property
    undefined, // question token if optional
    type, // type of property
  );
}

export function createBooleanLiteral(val: boolean): ts.BooleanLiteral {
  return val ? ts.factory.createTrue() : ts.factory.createFalse();
}

export function createStringType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
}

export function createNumberType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
}

export function createBooleanType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
}

export function createUndefinedType(): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(
    COMMON_IDENTIFIERS.undefined,
    undefined,
  );
}

export function createArrayType(typeArgument: ts.TypeNode): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Array, [
    typeArgument,
  ]);
}

export function createVoidType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
}

export function createAnyType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
}
