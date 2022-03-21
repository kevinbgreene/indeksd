import { Definition, Identifier } from '../parser';

export function definitionForIdentifier(
  id: Identifier,
  context: ReadonlyArray<Definition>,
): Definition | null {
  for (const def of context) {
    switch (def.kind) {
      case 'DatabaseDefinition':
        const result = definitionForIdentifier(id, def.body);
        if (result != null) {
          return result;
        }
      case 'TableDefinition':
      case 'TypeDefinition':
        if (def.name.value === id.value) {
          return def;
        }
    }
  }

  return null;
}
