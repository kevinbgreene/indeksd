import {
  BaseType,
  BooleanLiteral,
  TypeNode,
  FloatLiteral,
  Identifier,
  IntegerLiteral,
  KeywordType,
  MapType,
  StringLiteral,
  SyntaxKind,
  TextLocation,
  TextPosition,
  Token,
} from './parser/types';

export function createToken(
  kind: SyntaxKind,
  text: string,
  loc: TextLocation,
): Token {
  return { kind, text, loc };
}

export function createIdentifier(value: string, loc: TextLocation): Identifier {
  return { kind: 'Identifier', value, loc };
}

export function createKeywordFieldType(
  kind: KeywordType,
  loc: TextLocation,
): BaseType {
  return { kind, loc };
}

export function createTextLocation(
  start: TextPosition,
  end: TextPosition,
): TextLocation {
  return { start, end };
}

export function createMapFieldType(
  keyType: TypeNode,
  valueType: TypeNode,
  loc: TextLocation,
): MapType {
  return {
    kind: 'MapType',
    keyType,
    valueType,
    loc,
  };
}

export function createBooleanLiteral(
  value: boolean,
  loc: TextLocation,
): BooleanLiteral {
  return { kind: 'BooleanLiteral', value, loc };
}

export function createStringLiteral(
  value: string,
  loc: TextLocation,
): StringLiteral {
  return {
    kind: 'StringLiteral',
    value,
    loc,
  };
}

export function createIntegerLiteral(
  value: string,
  loc: TextLocation,
): IntegerLiteral {
  return { kind: 'IntegerLiteral', value, loc };
}

export function createFloatLiteral(
  value: string,
  loc: TextLocation,
): FloatLiteral {
  return { kind: 'FloatLiteral', value, loc };
}
