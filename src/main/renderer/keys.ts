import ts = require('typescript');
import { FieldDefinition, TypeNode, TableDefinition } from '../parser';

export type TableIndex = Readonly<{
  indexKind: 'autoincrement' | 'index';
  name: string;
  type: TypeNode;
}>;

export function getIndexesForTable(
  def: TableDefinition,
): ReadonlyArray<TableIndex> {
  const indexFields = def.body.filter((next) => {
    return (
      next.annotation?.name.value === 'autoincrement' ||
      next.annotation?.name.value === 'index'
    );
  });

  return indexFields.map((next) => {
    return {
      indexKind:
        next.annotation?.name.value === 'autoincrement'
          ? 'autoincrement'
          : 'index',
      name: next.name.value,
      type: next.type,
    };
  });
}

export function autoincrementFieldsForTable(
  def: TableDefinition,
): ReadonlyArray<FieldDefinition> {
  return def.body.filter(
    (next) => next.annotation?.name.value === 'autoincrement',
  );
}
