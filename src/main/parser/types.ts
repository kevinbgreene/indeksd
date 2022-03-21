export interface Node {
  kind: SyntaxKind;
}

export interface TextPosition {
  line: number;
  column: number;
  index: number;
}

export interface TextLocation {
  start: TextPosition;
  end: TextPosition;
}

export interface SyntaxNode extends Node {
  loc: TextLocation;
}

export interface Token extends SyntaxNode {
  text: string;
}

export type KeywordType = 'StringKeyword' | 'NumberKeyword' | 'BooleanKeyword';

export interface KeywordTypeNode extends SyntaxNode {
  kind: KeywordType;
}

export interface TypeReferenceNode extends SyntaxNode {
  kind: 'TypeReferenceNode';
  name: Identifier;
  typeArgs: ReadonlyArray<TypeNode>;
}

export type LiteralType =
  | StringLiteral
  | IntegerLiteral
  | FloatLiteral
  | BooleanLiteral;

export interface PropertySignature extends SyntaxNode {
  kind: 'PropertySignature';
  name: Identifier;
  type: TypeNode;
}

export interface ObjectLiteralTypeNode extends SyntaxNode {
  kind: 'ObjectLiteralTypeNode';
  members: ReadonlyArray<PropertySignature>;
}

export interface TupleTypeNode extends SyntaxNode {
  kind: 'TupleTypeNode';
}

export interface RangeTypeNode extends SyntaxNode {
  kind: 'RangeTypeNode';
  startValue: IntegerLiteral;
  endValue: IntegerLiteral;
}

export type TypeNode =
  | LiteralType
  | KeywordTypeNode
  | TypeReferenceNode
  | RangeTypeNode
  | ObjectLiteralTypeNode;

export interface StringLiteral extends SyntaxNode {
  kind: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral extends SyntaxNode {
  kind: 'BooleanLiteral';
  value: boolean;
}

export interface IntegerLiteral extends SyntaxNode {
  kind: 'IntegerLiteral';
  value: string;
}

export interface FloatLiteral extends SyntaxNode {
  kind: 'FloatLiteral';
  value: string;
}

export interface Annotation extends SyntaxNode {
  kind: 'Annotation';
  name: Identifier;
  arguments: ReadonlyArray<StringLiteral>;
}

export interface FieldDefinition extends SyntaxNode {
  kind: 'FieldDefinition';
  annotations: Annotations;
  name: Identifier;
  type: TypeNode;
}

export type Expression =
  | StringLiteral
  | FloatLiteral
  | IntegerLiteral
  | Identifier;

export type Annotations = ReadonlyArray<Annotation>;

export type Definition = TypeDefinition | DatabaseDefinition | TableDefinition;

export interface TypeDefinition extends SyntaxNode {
  kind: 'TypeDefinition';
  name: Identifier;
  body: ReadonlyArray<TypeNode>;
}

export interface TableDefinition extends SyntaxNode {
  kind: 'TableDefinition';
  name: Identifier;
  body: ReadonlyArray<FieldDefinition>;
  annotations: Annotations;
}

export interface DatabaseDefinition extends SyntaxNode {
  kind: 'DatabaseDefinition';
  name: Identifier;
  body: ReadonlyArray<TableDefinition>;
  tokens?: ReadonlyArray<Token>;
}

export interface DatabaseSchema extends Node {
  kind: 'DatabaseSchema';
  body: ReadonlyArray<DatabaseDefinition | TypeDefinition>;
  tokens?: ReadonlyArray<Token>;
}

export interface Identifier extends SyntaxNode {
  kind: 'Identifier';
  value: string;
}

export type Keyword =
  | 'TableKeyword'
  | 'DatabaseKeyword'
  | 'TypeKeyword'
  | 'StringKeyword'
  | 'NumberKeyword'
  | 'BooleanKeyword'
  | 'TrueKeyword'
  | 'FalseKeyword';

export type Structure =
  | 'DatabaseSchema'
  | 'DatabaseDefinition'
  | 'TableDefinition'
  | 'TypeDefinition'
  | 'FieldDefinition'
  | 'Annotation'
  | 'Identifier';

export type Literal =
  | 'StringLiteral'
  | 'IntegerLiteral'
  | 'FloatLiteral'
  | 'BooleanLiteral';

export type Type =
  | 'TypeReferenceNode'
  | 'RangeTypeNode'
  | 'ObjectLiteralTypeNode'
  | 'TupleTypeNode'
  | 'PropertySignature';

export type CharacterToken =
  | 'CommaToken'
  | 'ColonToken'
  | 'SemicolonToken'
  | 'RightBraceToken'
  | 'LeftBraceToken'
  | 'RightParenToken'
  | 'LeftParenToken'
  | 'GreaterThanToken'
  | 'LessThanToken'
  | 'AtToken'
  | 'PipeToken'
  | 'EqualToken'
  | 'DotDotToken';

export type EndOfFile = 'EOF';

export type SyntaxKind =
  | Keyword
  | Structure
  | Literal
  | Type
  | CharacterToken
  | EndOfFile;
