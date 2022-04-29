import { factory } from 'typescript';
import {
  KeywordTypeNode,
  BooleanLiteral,
  TypeNode,
  FloatLiteral,
  Identifier,
  IntegerLiteral,
  KeywordType,
  StringLiteral,
  SyntaxKind,
  TextLocation,
  TextPosition,
  Token,
  DatabaseSchema,
  DatabaseDefinition,
  TypeDefinition,
  TableDefinition,
  Annotation,
  FieldDefinition,
  TypeReferenceNode,
  RangeTypeNode,
  PropertySignature,
  ObjectLiteralTypeNode,
  TupleTypeNode,
} from './parser/types';

export function createToken(
  kind: SyntaxKind,
  text: string,
  loc: TextLocation,
): Token {
  return { kind, text, loc };
}

export function createDatabaseSchema(
  body: ReadonlyArray<DatabaseDefinition | TypeDefinition>,
): DatabaseSchema {
  return {
    kind: 'DatabaseSchema',
    body,
  };
}

export function createDatabaseDefinition(
  name: Identifier,
  tables: ReadonlyArray<TableDefinition>,
  location: TextLocation,
  annotations: ReadonlyArray<Annotation>,
): DatabaseDefinition {
  return {
    kind: 'DatabaseDefinition',
    name,
    body: tables,
    annotations,
    loc: location,
  };
}

export function createTableDefinition(
  name: Identifier,
  body: ReadonlyArray<FieldDefinition>,
  annotations: ReadonlyArray<Annotation>,
  location: TextLocation,
): TableDefinition {
  return {
    kind: 'TableDefinition',
    name,
    body,
    annotations,
    loc: location,
  };
}

export function createTypeDefinition(
  name: Identifier,
  body: ReadonlyArray<TypeNode>,
  location: TextLocation,
): TypeDefinition {
  return {
    kind: 'TypeDefinition',
    name,
    body,
    loc: location,
  };
}

export function createAnnotation(
  name: Identifier,
  args: ReadonlyArray<StringLiteral | IntegerLiteral>,
  location: TextLocation,
): Annotation {
  return {
    kind: 'Annotation',
    name,
    arguments: args,
    loc: location,
  };
}

export function createFieldDefinition(
  name: Identifier,
  annotations: ReadonlyArray<Annotation>,
  type: TypeNode,
  location: TextLocation,
): FieldDefinition {
  return {
    kind: 'FieldDefinition',
    name,
    annotations,
    type,
    loc: location,
  };
}

export function createIdentifier(value: string, loc: TextLocation): Identifier {
  return { kind: 'Identifier', value, loc };
}

export function createKeywordFieldType(
  kind: KeywordType,
  loc: TextLocation,
): KeywordTypeNode {
  return { kind, loc };
}

export function createTextLocation(
  start: TextPosition,
  end: TextPosition,
): TextLocation {
  return { start, end };
}

export function createRangeTypeNode(
  startValue: IntegerLiteral,
  endValue: IntegerLiteral,
  loc: TextLocation,
): RangeTypeNode {
  return {
    kind: 'RangeTypeNode',
    startValue,
    endValue,
    loc,
  };
}

export function createObjectLiteralTypeNode(
  members: ReadonlyArray<PropertySignature>,
  loc: TextLocation,
): ObjectLiteralTypeNode {
  return {
    kind: 'ObjectLiteralTypeNode',
    members,
    loc,
  };
}

export function createPropertySignature(
  name: Identifier,
  type: TypeNode,
  loc: TextLocation,
): PropertySignature {
  return {
    kind: 'PropertySignature',
    name,
    type,
    loc,
  };
}

export function createTupleTypeNode(
  members: ReadonlyArray<TypeNode>,
  loc: TextLocation,
): TupleTypeNode {
  return {
    kind: 'TupleTypeNode',
    members,
    loc,
  };
}

export function createTypeReferenceNode(
  name: Identifier,
  typeArgs: ReadonlyArray<TypeNode>,
  loc: TextLocation,
): TypeReferenceNode {
  return {
    kind: 'TypeReferenceNode',
    name,
    typeArgs,
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
