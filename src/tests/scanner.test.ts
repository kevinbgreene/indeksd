import * as assert from 'node:assert';
import { createScanner, Scanner } from '../main/parser/scanner';
import { Token } from '../main/parser/types';
import { loadSource } from './testUtils';

const content = loadSource('test');
const scanner: Scanner = createScanner(content);
const tokens: Array<Token> = scanner.scan();

const expected: Array<Token> = [];

assert.deepEqual(tokens, expected);
