import * as fs from 'fs';
import * as path from 'path';

export function loadSource(name: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), `./src/tests/fixtures/${name}.db`),
    'utf-8',
  );
}

export function loadSolution(name: string): object {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), `./src/tests/solutions/${name}.solution.json`),
      'utf-8',
    ),
  );
}
