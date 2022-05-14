import * as ts from 'typescript';
import { TypeNode } from '../../parser';
import {
  createBooleanLiteral,
  createBooleanType,
  createNumberType,
  createStringType,
} from './baseTypes';
import { createRangeType } from './rangeTypes';

export function typeForTypeNode(typeNode: TypeNode): ts.TypeNode {
  switch (typeNode.kind) {
    case 'TypeReferenceNode':
      return ts.factory.createTypeReferenceNode(
        typeNode.name.value,
        typeNode.typeArgs.map(typeForTypeNode),
      );

    case 'ObjectLiteralTypeNode':
      return ts.factory.createTypeLiteralNode(
        typeNode.members.map((next) => {
          return ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(next.name.value),
            undefined,
            typeForTypeNode(next.type),
          );
        }),
      );

    case 'TupleTypeNode':
      return ts.factory.createTupleTypeNode(
        typeNode.members.map((next) => {
          return typeForTypeNode(next);
        }),
      );

    case 'RangeTypeNode':
      return createRangeType(typeNode);

    case 'StringKeyword':
      return createStringType();

    case 'BooleanKeyword':
      return createBooleanType();

    case 'NumberKeyword':
      return createNumberType();

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
