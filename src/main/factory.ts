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
  Expression,
  ObjectLiteral,
  ObjectLiteralElement,
  ArrayLiteral,
} from './parser/types';

export function createToken(
  kind: SyntaxKind,
  text: string,
  location: TextLocation,
): Token {
  return { kind, text, location };
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
    location,
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
    location,
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
    location,
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
    location,
  };
}

export function createArrayLiteral(
  items: ReadonlyArray<Expression>,
  location: TextLocation,
): ArrayLiteral {
  return {
    kind: 'ArrayLiteral',
    items,
    location,
  };
}

export function createObjectLiteral(
  elements: ReadonlyArray<ObjectLiteralElement>,
  location: TextLocation,
): ObjectLiteral {
  return {
    kind: 'ObjectLiteral',
    elements,
    location,
  };
}

export function createObjectLiteralElement(
  key: Identifier,
  value: Expression,
  location: TextLocation,
): ObjectLiteralElement {
  return {
    kind: 'ObjectLiteralElement',
    key,
    value,
    location,
  };
}

export function createFieldDefinition(
  name: Identifier,
  required: boolean,
  annotations: ReadonlyArray<Annotation>,
  type: TypeNode,
  defaultValue: Expression | null,
  location: TextLocation,
): FieldDefinition {
  return {
    kind: 'FieldDefinition',
    name,
    required,
    annotations,
    type,
    defaultValue,
    location,
  };
}

export function createIdentifier(
  value: string,
  location: TextLocation,
): Identifier {
  return { kind: 'Identifier', value, location };
}

export function createKeywordFieldType(
  kind: KeywordType,
  location: TextLocation,
): KeywordTypeNode {
  return { kind, location };
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
  location: TextLocation,
): RangeTypeNode {
  return {
    kind: 'RangeTypeNode',
    startValue,
    endValue,
    location,
  };
}

export function createObjectLiteralTypeNode(
  members: ReadonlyArray<PropertySignature>,
  location: TextLocation,
): ObjectLiteralTypeNode {
  return {
    kind: 'ObjectLiteralTypeNode',
    members,
    location,
  };
}

export function createPropertySignature(
  name: Identifier,
  type: TypeNode,
  location: TextLocation,
): PropertySignature {
  return {
    kind: 'PropertySignature',
    name,
    type,
    location,
  };
}

export function createTupleTypeNode(
  members: ReadonlyArray<TypeNode>,
  location: TextLocation,
): TupleTypeNode {
  return {
    kind: 'TupleTypeNode',
    members,
    location,
  };
}

export function createTypeReferenceNode(
  name: Identifier,
  typeArgs: ReadonlyArray<TypeNode>,
  location: TextLocation,
): TypeReferenceNode {
  return {
    kind: 'TypeReferenceNode',
    name,
    typeArgs,
    location,
  };
}

export function createBooleanLiteral(
  value: boolean,
  location: TextLocation,
): BooleanLiteral {
  return { kind: 'BooleanLiteral', value, location };
}

export function createStringLiteral(
  value: string,
  location: TextLocation,
): StringLiteral {
  return {
    kind: 'StringLiteral',
    value,
    location,
  };
}

export function createIntegerLiteral(
  value: string,
  location: TextLocation,
): IntegerLiteral {
  return { kind: 'IntegerLiteral', value, location };
}

export function createFloatLiteral(
  value: string,
  location: TextLocation,
): FloatLiteral {
  return { kind: 'FloatLiteral', value, location };
}
