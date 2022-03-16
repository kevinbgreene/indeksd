import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { TypeNode } from '../parser/types';

export function typeForTypeNode(typeNode: TypeNode): ts.TypeNode {
  switch (typeNode.kind) {
    case 'TypeReferenceNode':
      return ts.factory.createTypeReferenceNode(
        typeNode.name.value,
        typeNode.typeArgs.map(typeForTypeNode),
      );

    case 'StringKeyword':
      return createStringType();

    case 'BooleanKeyword':
      return createBooleanType();

    case 'NumberKeyword':
      return createBooleanType();

    case 'StringLiteral':
      return ts.factory.createLiteralTypeNode(
        ts.factory.createStringLiteral(typeNode.value),
      );

    case 'IntegerLiteral':
      return ts.factory.createLiteralTypeNode(
        ts.factory.createNumericLiteral(parseInt(typeNode.value)),
      );

    case 'FloatLiteral':
      return ts.factory.createLiteralTypeNode(
        ts.factory.createNumericLiteral(parseFloat(typeNode.value)),
      );

    case 'BooleanLiteral':
      return ts.factory.createLiteralTypeNode(
        createBooleanLiteral(typeNode.value),
      );

    default:
      const msg: never = typeNode;
      throw new Error(`Non-exhaustive match for: ${msg}`);
  }
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

export function createStringType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
}

export function createNumberType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
}

export function createBooleanType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
}

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
