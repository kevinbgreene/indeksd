import * as assert from 'node:assert';
import { loadSource } from './testUtils';
import { make } from '../main';

const content = loadSource('test');
const schema = make(content);
const expected = '';

console.log({ schema });

assert.deepStrictEqual(schema, expected);
