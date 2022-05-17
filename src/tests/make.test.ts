import * as assert from 'node:assert';
import { loadSolution, loadSource } from './testUtils';
import { make } from '../main';
import * as fs from 'fs-extra';
import * as path from 'path';

const content = loadSource('test');
const schema = make(content);
const expected = loadSolution('test');

function saveFiles(content: string): void {
  const outPath: string = path.resolve(__dirname, `./test-schema.ts`);
  try {
    fs.outputFileSync(outPath, content);
  } catch (err) {
    throw new Error(`Unable to save generated files to: ${outPath}`);
  }
}

saveFiles(schema);

assert.deepStrictEqual(schema, expected);
