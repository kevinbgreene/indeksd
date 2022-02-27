import * as assert from 'node:assert';
import { Scanner, createScanner } from '../main/parser/scanner';
import { createParser, Parser } from '../main/parser/parser';
import { DatabaseSchema, Token } from '../main/parser/types';
import { loadSource } from './testUtils';

const content = loadSource('test');
const scanner: Scanner = createScanner(content);
const tokens: Array<Token> = scanner.scan();

const parser: Parser = createParser(tokens);
const schema: DatabaseSchema = parser.parse();

console.log(JSON.stringify(schema, null, 4));

assert.deepEqual(schema, {});
