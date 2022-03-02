import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { FieldType } from '../parser/types';

export function typeNodeForFieldType(fieldType: FieldType): ts.TypeNode {
  switch (fieldType.type) {
    case 'Identifier':
      return ts.factory.createTypeReferenceNode(fieldType.value);

    case 'SetType':
      return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Set, [
        typeNodeForFieldType(fieldType.valueType),
      ]);

    case 'MapType':
      return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Map, [
        typeNodeForFieldType(fieldType.keyType),
        typeNodeForFieldType(fieldType.valueType),
      ]);

    case 'ArrayType':
      return createArrayType(typeNodeForFieldType(fieldType.valueType));

    case 'StringKeyword':
      return createStringType();

    case 'BooleanKeyword':
      return createBooleanType();

    case 'NumberKeyword':
      return createBooleanType();

    case 'StringLiteral':
      return ts.factory.createLiteralTypeNode(
        ts.factory.createStringLiteral(fieldType.value),
      );

    case 'IntegerLiteral':
      return ts.factory.createLiteralTypeNode(
        ts.factory.createNumericLiteral(parseInt(fieldType.value)),
      );

    case 'FloatLiteral':
      return ts.factory.createLiteralTypeNode(
        ts.factory.createNumericLiteral(parseFloat(fieldType.value)),
      );

    case 'BooleanLiteral':
      return ts.factory.createLiteralTypeNode(
        createBooleanLiteral(fieldType.value),
      );

    default:
      const msg: never = fieldType;
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

export function createStringType(): ts.KeywordTypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
}

export function createNumberType(): ts.KeywordTypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
}

export function createBooleanType(): ts.KeywordTypeNode {
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
