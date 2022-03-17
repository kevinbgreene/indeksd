import * as assert from 'node:assert';
import { loadSolution, loadSource } from './testUtils';
import { make } from '../main';

const content = loadSource('test');
const schema = make(content);
const expected = loadSolution('test');

assert.deepStrictEqual(schema, expected);
