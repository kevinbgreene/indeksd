import {
  BaseType,
  BooleanLiteral,
  FieldType,
  FloatLiteral,
  Identifier,
  IntegerLiteral,
  KeywordType,
  MapType,
  StringLiteral,
  SyntaxType,
  TextLocation,
  TextPosition,
  Token,
} from './parser/types';

export function createToken(
  type: SyntaxType,
  text: string,
  loc: TextLocation,
): Token {
  return { type, text, loc };
}

export function createIdentifier(value: string, loc: TextLocation): Identifier {
  return { type: 'Identifier', value, loc };
}

export function createKeywordFieldType(
  type: KeywordType,
  loc: TextLocation,
): BaseType {
  return { type, loc };
}

export function createTextLocation(
  start: TextPosition,
  end: TextPosition,
): TextLocation {
  return { start, end };
}

export function createMapFieldType(
  keyType: FieldType,
  valueType: FieldType,
  loc: TextLocation,
): MapType {
  return {
    type: 'MapType',
    keyType,
    valueType,
    loc,
  };
}

export function createBooleanLiteral(
  value: boolean,
  loc: TextLocation,
): BooleanLiteral {
  return { type: 'BooleanLiteral', value, loc };
}

export function createStringLiteral(
  value: string,
  loc: TextLocation,
): StringLiteral {
  return {
    type: 'StringLiteral',
    value,
    loc,
  };
}

export function createIntegerLiteral(
  value: string,
  loc: TextLocation,
): IntegerLiteral {
  return { type: 'IntegerLiteral', value, loc };
}

export function createFloatLiteral(
  value: string,
  loc: TextLocation,
): FloatLiteral {
  return { type: 'FloatLiteral', value, loc };
}
