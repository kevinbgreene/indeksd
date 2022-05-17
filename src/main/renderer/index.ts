import { renderDatabaseDefinition } from './database';
import { renderTypeDefinition } from './typedef';

export { renderDatabaseDefinition, renderTypeDefinition };

import * as ts from 'typescript';
import * as renderer from '../renderer';
import { Definition } from '../parser/types';

export function renderDefinition(def: Definition): ReadonlyArray<ts.Statement> {
  switch (def.kind) {
    case 'TypeDefinition':
      return [renderer.renderTypeDefinition(def)];
    case 'DatabaseDefinition':
      return renderer.renderDatabaseDefinition(def);
    case 'TableDefinition':
      return [];
    default:
      const msg: never = def;
      throw new Error(`Non-exhaustive match for statement: ${msg}`);
  }
}

export function renderDefinitions(
  defs: ReadonlyArray<Definition>,
): ReadonlyArray<ts.Statement> {
  return defs.reduce((acc: Array<ts.Statement>, next: Definition) => {
    return [...acc, ...renderDefinition(next)];
  }, []);
}
