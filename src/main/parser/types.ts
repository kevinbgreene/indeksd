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

export interface BaseType extends SyntaxNode {
  kind: KeywordType;
}

export interface SetType extends SyntaxNode {
  kind: 'SetType';
  valueType: TypeNode;
}

export interface ArrayType extends SyntaxNode {
  kind: 'ArrayType';
  valueType: TypeNode;
}

export interface MapType extends SyntaxNode {
  kind: 'MapType';
  keyType: TypeNode;
  valueType: TypeNode;
}

export type ContainerType = SetType | MapType | ArrayType;

export type ValueType =
  | StringLiteral
  | IntegerLiteral
  | FloatLiteral
  | BooleanLiteral;

export type TypeNode = ValueType | BaseType | ContainerType | Identifier;

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
  | 'MapKeyword'
  | 'SetKeyword'
  | 'ArrayKeyword'
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

export type Type = 'SetType' | 'MapType' | 'ArrayType';

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
  | 'EqualToken';

export type EndOfFile = 'EOF';

export type SyntaxKind =
  | Keyword
  | Structure
  | Literal
  | Type
  | CharacterToken
  | EndOfFile;
