export interface Node {
  type: SyntaxType;
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
  type: KeywordType;
}

export interface SetType extends SyntaxNode {
  type: 'SetType';
  valueType: FieldType;
}

export interface ArrayType extends SyntaxNode {
  type: 'ArrayType';
  valueType: FieldType;
}

export interface MapType extends SyntaxNode {
  type: 'MapType';
  keyType: FieldType;
  valueType: FieldType;
}

export type ContainerType = SetType | MapType | ArrayType;

export type ValueType =
  | StringLiteral
  | IntegerLiteral
  | FloatLiteral
  | BooleanLiteral;

export type FieldType = ValueType | BaseType | ContainerType | Identifier;

export interface StringLiteral extends SyntaxNode {
  type: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral extends SyntaxNode {
  type: 'BooleanLiteral';
  value: boolean;
}

export interface IntegerLiteral extends SyntaxNode {
  type: 'IntegerLiteral';
  value: string;
}

export interface FloatLiteral extends SyntaxNode {
  type: 'FloatLiteral';
  value: string;
}

export interface Annotation extends SyntaxNode {
  type: 'Annotation';
  name: Identifier;
}

export interface FieldDefinition extends SyntaxNode {
  type: 'FieldDefinition';
  annotation?: Annotation;
  name: Identifier;
  fieldType: FieldType;
}

export type Definition = TypeDefinition | DatabaseDefinition | TableDefinition;

export interface TypeDefinition extends SyntaxNode {
  type: 'TypeDefinition';
  name: Identifier;
  body: Array<FieldType>;
}

export interface TableDefinition extends SyntaxNode {
  type: 'TableDefinition';
  name: Identifier;
  body: Array<FieldDefinition>;
}

export interface DatabaseDefinition extends SyntaxNode {
  type: 'DatabaseDefinition';
  name: Identifier;
  body: Array<TableDefinition>;
  tokens?: Array<Token>;
}

export interface DatabaseSchema extends Node {
  type: 'DatabaseSchema';
  body: Array<DatabaseDefinition | TypeDefinition>;
  tokens?: Array<Token>;
}

export interface Identifier extends SyntaxNode {
  type: 'Identifier';
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
  | 'GreaterThanToken'
  | 'LessThanToken'
  | 'AtToken'
  | 'PipeToken'
  | 'EqualToken';

export type EndOfFile = 'EOF';

export type SyntaxType =
  | Keyword
  | Structure
  | Literal
  | Type
  | CharacterToken
  | EndOfFile;
