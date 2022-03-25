import { TableDefinition } from '../parser';
import { getAnnotationsByName } from './keys';
import { capitalize } from './utils';

export function getItemNameForTable(def: TableDefinition): string {
  const itemAnnotations = getAnnotationsByName(def.annotations, 'item');
  if (itemAnnotations.length > 1) {
    throw new Error('Table can only include one annotation for "item"');
  }

  const itemArguments = itemAnnotations[0]?.arguments;
  if (itemArguments && itemArguments.length > 1) {
    throw new Error('Table can only include one name alias');
  }

  if (itemArguments && itemArguments.length > 0) {
    return itemArguments[0]?.value;
  }

  return capitalize(def.name.value);
}
