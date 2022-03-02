import {
  Annotation,
  FieldDefinition,
  FieldType,
  ArrayType,
  MapType,
  SetType,
  SyntaxType,
  TextLocation,
  Token,
  DatabaseSchema,
  DatabaseDefinition,
  TableDefinition,
  TypeDefinition,
} from './types';

import * as factory from '../factory';

export interface Parser {
  parse(): DatabaseSchema;
  synchronize(): void;
}

function isStartOfDefinition(token: Token): boolean {
  switch (token.type) {
    case 'DatabaseKeyword':
    case 'TableKeyword':
      return true;

    default:
      return false;
  }
}

class ParseError extends Error {
  public message: string;
  public loc: TextLocation;
  constructor(msg: string, loc: TextLocation) {
    super(msg);
    this.message = msg;
    this.loc = loc;
  }
}

export function createParser(tokens: Array<Token>): Parser {
  let comments: Array<Comment> = [];
  let currentIndex: number = 0;

  // PUBLIC
  function parse(): DatabaseSchema {
    const schema: DatabaseSchema = {
      type: 'DatabaseSchema',
      body: [],
    };

    while (!isAtEnd()) {
      const def = parseDefinition();
      if (def !== null) {
        schema.body.push(def);
      }
    }

    return schema;
  }

  // Finds the beginning of the next statement so we can continue parse after error.
  function synchronize(): void {
    while (!isAtEnd() && !isStartOfDefinition(currentToken())) {
      advance();
    }
  }

  function parseDefinition(): DatabaseDefinition | TypeDefinition | null {
    const next: Token = currentToken();

    console.log({ next });

    switch (next.type) {
      case 'DatabaseKeyword':
        return parseDatabaseDefinition();

      case 'TypeKeyword':
        return parseTypeDefinition();

      // case SyntaxType.CommentBlock:
      // case SyntaxType.CommentLine:
      //   consumeComments();
      //   return null;

      default:
        throw reportError(`Invalid start to Database definition ${next.text}`);
    }
  }

  // DatabaseDefinition → 'database' Identifier '{' TableDefinition* '}'
  function parseDatabaseDefinition(): DatabaseDefinition {
    const _keywordToken: Token | null = consume('DatabaseKeyword');
    const keywordToken: Token = requireValue(
      _keywordToken,
      `Unable to find database keyword for database`,
    );
    const _nameToken: Token | null = consume('Identifier');
    const nameToken: Token = requireValue(
      _nameToken,
      `Unable to find identifier for database`,
    );

    const _openBrace: Token | null = consume('LeftBraceToken');
    const openBrace = requireValue(_openBrace, `Expected opening curly brace`);

    const tables: Array<TableDefinition> = parseTableDefinitions();

    const _closeBrace: Token | null = consume('RightBraceToken');
    const closeBrace = requireValue(
      _closeBrace,
      `Expected closing curly brace`,
    );

    const location: TextLocation = factory.createTextLocation(
      keywordToken.loc.start,
      closeBrace.loc.end,
    );

    return {
      type: 'DatabaseDefinition',
      name: factory.createIdentifier(nameToken.text, nameToken.loc),
      body: tables,
      loc: location,
    };
  }

  function parseTableDefinitions(): Array<TableDefinition> {
    const tables: Array<TableDefinition> = [];

    while (!check('RightBraceToken')) {
      tables.push(parseTableDefinition());

      if (check('DatabaseKeyword')) {
        throw reportError(
          `Closing curly brace expected, but new database found`,
        );
      } else if (check('EOF')) {
        throw reportError(
          `Closing curly brace expected but reached end of file`,
        );
      }
    }

    return tables;
  }

  function parseTableDefinition(): TableDefinition {
    const _keywordToken: Token | null = consume('TableKeyword');
    const keywordToken: Token = requireValue(
      _keywordToken,
      `Unable to find table keyword for table`,
    );
    const _nameToken: Token | null = consume('Identifier');
    const nameToken: Token = requireValue(
      _nameToken,
      `Unable to find identifier for table`,
    );

    const _openBrace: Token | null = consume('LeftBraceToken');
    requireValue(_openBrace, `Expected opening curly brace`);

    const fields: Array<FieldDefinition> = parseFields();

    const _closeBrace: Token | null = consume('RightBraceToken');
    const closeBrace = requireValue(
      _closeBrace,
      `Expected closing curly brace`,
    );

    const location: TextLocation = factory.createTextLocation(
      keywordToken.loc.start,
      closeBrace.loc.end,
    );

    return {
      type: 'TableDefinition',
      name: factory.createIdentifier(nameToken.text, nameToken.loc),
      body: fields,
      loc: location,
    };
  }

  // TypeDefinition → 'type ' Identifier '=' FieldType ('|' FieldType)* ';'
  function parseTypeDefinition(): TypeDefinition {
    const _keywordToken: Token | null = consume('TypeKeyword');
    const keywordToken: Token = requireValue(
      _keywordToken,
      `Unable to find type keyword for type`,
    );
    const _nameToken: Token | null = consume('Identifier');
    const nameToken: Token = requireValue(
      _nameToken,
      `Unable to find identifier for type`,
    );

    const equalToken: Token | null = consume('EqualToken');
    requireValue(equalToken, `Expected '='`);

    const fields: Array<FieldType> = parseFieldTypes();

    const _semicolon: Token | null = consume('SemicolonToken');
    const semicolon: Token = requireValue(
      _semicolon,
      'Field definition should end with semicolon',
    );

    const endLoc: TextLocation = semicolon.loc;
    const location: TextLocation = factory.createTextLocation(
      keywordToken.loc.start,
      endLoc.end,
    );

    return {
      type: 'TypeDefinition',
      name: factory.createIdentifier(nameToken.text, nameToken.loc),
      body: fields,
      loc: location,
    };
  }

  // Annotation → '@' Identifier
  function parseAnnotation(): Annotation | null {
    const atToken: Token | null = consume('AtToken');
    if (atToken == null) {
      return null;
    }

    const nameToken: Token = requireValue(
      consume('Identifier'),
      `Annotation must have a name`,
    );

    return {
      type: 'Annotation',
      name: factory.createIdentifier(nameToken.text, nameToken.loc),
      loc: factory.createTextLocation(atToken.loc.start, nameToken.loc.end),
    };
  }

  function parseFields(): Array<FieldDefinition> {
    const fields: Array<FieldDefinition> = [];

    while (!check('RightBraceToken')) {
      fields.push(parseField());

      if (isStartOfDefinition(currentToken())) {
        throw reportError(
          `Closing curly brace expected, but new statement found`,
        );
      } else if (check('EOF')) {
        throw reportError(
          `Closing curly brace expected but reached end of file`,
        );
      }
    }

    return fields;
  }

  // Field → ?Annotation Identifier ':' FieldType ';'
  function parseField(): FieldDefinition {
    const startLoc: TextLocation = currentToken().loc;
    const annotation: Annotation | null = parseAnnotation();
    const _nameToken: Token | null = consume('Identifier');
    const nameToken: Token = requireValue(
      _nameToken,
      `Unable to find identifier for field`,
    );

    const colonToken: Token | null = consume('ColonToken');
    requireValue(colonToken, 'Type annotation expected for field');

    const fieldType: FieldType = parseFieldType();
    const _semicolon: Token | null = consume('SemicolonToken');
    const semicolon: Token = requireValue(
      _semicolon,
      'Field definition should end with semicolon',
    );

    const endLoc: TextLocation = semicolon.loc;

    const location: TextLocation = factory.createTextLocation(
      startLoc.start,
      endLoc.end,
    );

    return {
      type: 'FieldDefinition',
      name: factory.createIdentifier(nameToken.text, nameToken.loc),
      annotation,
      fieldType,
      loc: location,
    };
  }

  function parseFieldTypes(): Array<FieldType> {
    const fieldTypes: Array<FieldType> = [];

    while (!check('SemicolonToken')) {
      fieldTypes.push(parseFieldType());
      consume('PipeToken');

      if (isStartOfDefinition(currentToken())) {
        throw reportError(
          `Closing semicolon expected, but new statement found`,
        );
      } else if (check('EOF')) {
        throw reportError(`Closing semicolon expected but reached end of file`);
      }
    }

    return fieldTypes;
  }

  // FieldType → Identifier | BaseType | ContainerType
  function parseFieldType(): FieldType {
    const typeToken: Token = advance();
    switch (typeToken.type) {
      case 'Identifier':
        return factory.createIdentifier(typeToken.text, typeToken.loc);

      case 'MapKeyword':
        return parseMapType();

      case 'ArrayKeyword':
        return parseArrayType();

      case 'SetKeyword':
        return parseSetType();

      case 'BooleanKeyword':
      case 'StringKeyword':
      case 'NumberKeyword':
        return factory.createKeywordFieldType(typeToken.type, typeToken.loc);

      case 'StringLiteral':
        return factory.createStringLiteral(typeToken.text, typeToken.loc);
      case 'IntegerLiteral':
        return factory.createIntegerLiteral(typeToken.text, typeToken.loc);
      case 'FloatLiteral':
        return factory.createFloatLiteral(typeToken.text, typeToken.loc);
      case 'TrueKeyword':
        return factory.createBooleanLiteral(true, typeToken.loc);
      case 'FalseKeyword':
        return factory.createBooleanLiteral(false, typeToken.loc);

      default:
        throw reportError(`FieldType expected but found: ${typeToken.type}`);
    }
  }

  // MapType → 'Map<' FieldType ',' FieldType '>'
  function parseMapType(): MapType {
    const _openBracket: Token | null = consume('LessThanToken');
    const openBracket: Token = requireValue(
      _openBracket,
      `Map needs to defined contained types`,
    );

    const keyType: FieldType = parseFieldType();
    const _commaToken: Token | null = consume('CommaToken');
    requireValue(
      _commaToken,
      `Comma expected to separate map types <key, value>`,
    );

    const valueType: FieldType = parseFieldType();
    const _closeBracket: Token | null = consume('GreaterThanToken');
    const closeBracket: Token = requireValue(
      _closeBracket,
      `Map needs to defined contained types`,
    );

    const location: TextLocation = {
      start: openBracket.loc.start,
      end: closeBracket.loc.end,
    };

    return factory.createMapFieldType(keyType, valueType, location);
  }

  // SetType → 'Set<' FieldType '>'
  function parseSetType(): SetType {
    const _openBracket: Token | null = consume('LessThanToken');
    const openBracket: Token = requireValue(
      _openBracket,
      `Map needs to defined contained types`,
    );

    const valueType: FieldType = parseFieldType();
    const _closeBracket: Token | null = consume('GreaterThanToken');
    const closeBracket: Token = requireValue(
      _closeBracket,
      `Map needs to defined contained types`,
    );

    return {
      type: 'SetType',
      valueType,
      loc: {
        start: openBracket.loc.start,
        end: closeBracket.loc.end,
      },
    };
  }

  // ArrayType → 'Array<' FieldType '>'
  function parseArrayType(): ArrayType {
    const _openBracket: Token | null = consume('LessThanToken');
    const openBracket: Token = requireValue(
      _openBracket,
      `Map needs to defined contained types`,
    );

    const valueType: FieldType = parseFieldType();
    const _closeBracket: Token | null = consume('GreaterThanToken');
    const closeBracket: Token = requireValue(
      _closeBracket,
      `Map needs to defined contained types`,
    );

    return {
      type: 'ArrayType',
      valueType,
      loc: {
        start: openBracket.loc.start,
        end: closeBracket.loc.end,
      },
    };
  }

  function currentToken(): Token {
    // consumeComments();
    return tokens[currentIndex];
  }

  function previousToken(): Token {
    return tokens[currentIndex - 1];
  }

  function peek(): Token {
    return tokens[currentIndex + 1];
  }

  // Does the current token match the given type
  function check(...types: Array<SyntaxType>): boolean {
    for (const type of types) {
      if (type === currentToken().type) {
        return true;
      }
    }

    return false;
  }

  // Does the current token match the given text
  function checkText(...strs: Array<string>): boolean {
    for (const str of strs) {
      if (str === currentToken().text) {
        return true;
      }
    }

    return false;
  }

  // requireToken the current token to match given type and advance, otherwise return null
  function consume(...types: Array<SyntaxType>): Token | null {
    for (const type of types) {
      if (check(type)) {
        return advance();
      }
    }

    return null;
  }

  // Move the cursor forward and return the previous token
  function advance(): Token {
    if (!isAtEnd()) {
      currentIndex += 1;
    }

    return previousToken();
  }

  function isAtEnd(): boolean {
    return currentIndex >= tokens.length || currentToken().type === 'EOF';
  }

  function getComments(): Array<Comment> {
    const current: Array<Comment> = comments;
    comments = [];
    return current;
  }

  function reportError(msg: string): Error {
    return new ParseError(msg, currentToken().loc);
  }

  // Throw if the given value doesn't exist.
  function requireValue<T>(val: T | null, msg: string): T {
    if (val === null || val === undefined) {
      throw reportError(msg);
    } else {
      return val;
    }
  }

  return {
    parse,
    synchronize,
  };
}
