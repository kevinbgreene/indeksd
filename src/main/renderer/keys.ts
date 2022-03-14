import {
  FieldDefinition,
  TypeNode,
  TableDefinition,
  Annotation,
} from '../parser';

export type TableIndex = Readonly<{
  indexKind: 'autoincrement' | 'index';
  name: string;
  type: TypeNode;
}>;

export function annotationsInclude(
  annotations: ReadonlyArray<Annotation>,
  name: string,
): boolean {
  for (const annotation of annotations) {
    if (annotation.name.value === name) {
      return true;
    }
  }

  return false;
}

export function getIndexesForTable(
  def: TableDefinition,
): ReadonlyArray<TableIndex> {
  const indexFields = def.body.filter((next) => {
    return (
      annotationsInclude(next.annotations, 'autoincrement') ||
      annotationsInclude(next.annotations, 'index')
    );
  });

  return indexFields.map((next) => {
    return {
      indexKind: annotationsInclude(next.annotations, 'autoincrement')
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
  return def.body.filter((field) =>
    field.annotations.find(
      (annotation) => annotation?.name.value === 'autoincrement',
    ),
  );
}

export function indexFieldsForTable(
  def: TableDefinition,
): ReadonlyArray<FieldDefinition> {
  return def.body.filter((next) =>
    annotationsInclude(next.annotations, 'index'),
  );
}
