import { createToken } from '../factory';
import { KEYWORDS } from '../keywords';
import { Keyword, SyntaxKind, TextLocation, Token } from './types';

function isDigit(value: string): boolean {
  return value >= '0' && value <= '9';
}

function isAlpha(value: string): boolean {
  return (value >= 'a' && value <= 'z') || (value >= 'A' && value <= 'Z');
}

// The first character of an Identifier can be a letter or underscore
function isAlphaOrUnderscore(value: string): boolean {
  return isAlpha(value) || value === '_';
}

function isValidIdentifier(value: string): boolean {
  return (
    isAlphaOrUnderscore(value) ||
    isDigit(value) ||
    value === '.' ||
    value === '-'
  );
}

function isWhiteSpace(char: string): boolean {
  switch (char) {
    case ' ':
    case '\r':
    case '\t':
    case '\n':
      return true;

    default:
      return false;
  }
}

class ScanError extends Error {
  public message: string;
  public loc: TextLocation;
  constructor(msg: string, loc: TextLocation) {
    super(msg);
    this.message = msg;
    this.loc = loc;
  }
}

export interface Scanner {
  scan(): Array<Token>;
  syncronize(): void;
}

export function createScanner(src: string) {
  const source: string = src;
  const tokens: Array<Token> = [];
  let line: number = 1;
  let column: number = 1;
  let startLine: number = 1;
  let startColumn: number = 1;
  let startIndex: number = 0;
  let currentIndex: number = 0;

  function scan(): Array<Token> {
    while (!isAtEnd()) {
      startIndex = currentIndex;
      startLine = line;
      startColumn = column;
      scanToken();
    }

    startIndex = currentIndex;
    addToken('EOF', '');

    return tokens;
  }

  // Find the beginning of the next word to restart parse after error
  function syncronize(): void {
    while (!isAtEnd() && !isWhiteSpace(current())) {
      advance();
    }
  }

  function scanToken(): void {
    const next = advance();
    switch (next) {
      case ' ':
      case '\r':
      case '\t':
        // Ignore whitespace.
        break;

      case '\n':
        nextLine();
        break;

      case '=':
        addToken('EqualToken', next);
        break;

      case ',':
        addToken('CommaToken', next);
        break;

      case '{':
        addToken('LeftBraceToken', next);
        break;

      case '}':
        addToken('RightBraceToken', next);
        break;

      case '(':
        addToken('LeftParenToken', next);
        break;

      case ')':
        addToken('RightParenToken', next);
        break;

      case '[':
        addToken('LeftBracketToken', next);
        break;

      case ']':
        addToken('RightBracketToken', next);
        break;

      case ';':
        addToken('SemicolonToken', next);
        break;

      case '@':
        addToken('AtToken', next);
        break;

      case '|':
        addToken('PipeToken', next);
        break;

      // Strings can use single or double quotes
      case '"':
      case "'":
        string(next);
        break;

      case ':':
        addToken('ColonToken', next);
        break;

      case '<':
        addToken('LessThanToken', next);
        break;

      case '>':
        addToken('GreaterThanToken', next);
        break;

      case '.':
        if (peek() === '.') {
          advance();
          addToken('DotDotToken', source.substring(startIndex, currentIndex));
          break;
        }

      default:
        if (isDigit(next)) {
          number();
        } else if (isAlphaOrUnderscore(next)) {
          identifier();
        } else if (isValidIdentifier(next)) {
          reportError(
            `Invalid identifier '${next}': Identifiers must begin with a letter or underscore`,
          );
        } else {
          reportError(`Unexpected token: ${next}`);
        }
    }
  }

  function identifier(): void {
    while (!isAtEnd() && peek() !== '\n' && isValidIdentifier(peek())) {
      advance();
    }

    const literal: string = source.substring(startIndex, currentIndex);
    const type: Keyword | undefined = KEYWORDS[literal];

    if (type == null) {
      addToken('Identifier', literal);
    } else {
      addToken(type, literal);
    }
  }

  function number(): void {
    integer();

    if (peek() === '.' && isDigit(peekNext())) {
      float();
    } else {
      commitToken('IntegerLiteral');
    }
  }

  function integer(): void {
    while (!isAtEnd() && peek() !== '\n' && isDigit(peek())) {
      advance();
    }
  }

  function float(): void {
    consume('.');
    integer();
    commitToken('FloatLiteral');
  }

  function string(terminator: string): void {
    while (!isAtEnd() && peek() !== terminator) {
      if (peek() === '\n') {
        nextLine();
      }

      if (peek() === '\\') {
        advance();
      }

      advance();
    }

    if (isAtEnd() && previous() !== terminator) {
      reportError(`String must be terminated with ${terminator}`);
    } else {
      // advance past closing "
      advance();

      // We use "+ 1" and "- 1" to remove the quote markes from the string and unsescape escaped terminators
      const literal: string = source
        .substring(startIndex + 1, currentIndex - 1)
        .replace(/\\(\"|\')/g, '$1');
      addToken('StringLiteral', literal);
    }
  }

  function consume(text: string): boolean {
    if (peek() === text) {
      advance();
      return true;
    }

    return false;
  }

  function advance(): string {
    currentIndex++;
    column++;
    return source.charAt(currentIndex - 1);
  }

  function previous(): string {
    return source.charAt(currentIndex - 2);
  }

  function current(): string {
    return source.charAt(currentIndex - 1);
  }

  function peek(): string {
    return source.charAt(currentIndex);
  }

  function peekNext(): string {
    return source.charAt(currentIndex + 1);
  }

  function nextLine() {
    line++;
    column = 1;
  }

  function currentLocation(): TextLocation {
    return {
      start: {
        line: startLine,
        column: startColumn,
        index: startIndex,
      },
      end: {
        line,
        column,
        index: currentIndex,
      },
    };
  }

  function commitToken(type: SyntaxKind): void {
    const literal: string = source.substring(startIndex, currentIndex);
    addToken(type, literal);
  }

  function addToken(type: SyntaxKind, value: string): void {
    const loc: TextLocation = currentLocation();
    tokens.push(createToken(type, value, loc));
  }

  function isAtEnd(): boolean {
    return currentIndex >= source.length;
  }

  function reportError(msg: string): void {
    throw new ScanError(msg, currentLocation());
  }

  return {
    scan,
    syncronize,
  };
}
