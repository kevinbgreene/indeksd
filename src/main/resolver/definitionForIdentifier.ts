import { Definition, Identifier } from '../parser';
import { getItemNameForTable } from '../renderer/common';

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
        break;
      case 'TableDefinition':
        const itemName = getItemNameForTable(def);
        if (itemName === id.value) {
          return def;
        }
        break;
      case 'TypeDefinition':
        if (def.name.value === id.value) {
          return def;
        }
        break;
    }
  }

  return null;
}
