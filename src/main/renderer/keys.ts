import {
  FieldDefinition,
  TypeNode,
  TableDefinition,
  Annotation,
  Annotations,
} from '../parser';

export type IndexKind = 'key' | 'index';

export type TableIndex = Readonly<{
  indexKind: IndexKind;
  name: string;
  type: TypeNode;
}>;

export function annotationsInclude(
  annotations: ReadonlyArray<Annotation>,
  names: ReadonlyArray<string>,
): boolean {
  for (const annotation of annotations) {
    if (names.includes(annotation.name.value)) {
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
      annotationsInclude(next.annotations, ['autoincrement']) ||
      annotationsInclude(next.annotations, ['index'])
    );
  });

  return indexFields.map((next) => {
    return {
      indexKind: annotationsInclude(next.annotations, ['autoincrement'])
        ? 'key'
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

export function getIndexFieldsForTable(
  def: TableDefinition,
): ReadonlyArray<FieldDefinition> {
  return def.body.filter((next) =>
    annotationsInclude(next.annotations, ['index']),
  );
}

export function getAnnotationsByName(
  annotations: Annotations,
  name: string,
): Annotations {
  return annotations.filter((next) => {
    return next.name.value === name;
  });
}
