import * as fs from 'fs';
import * as path from 'path';

export function loadSource(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, `./fixtures/source/${name}.db`),
    'utf-8',
  );
}

export function loadSolution(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, `./fixtures/solutions/${name}.solution.txt`),
    'utf-8',
  );
}
