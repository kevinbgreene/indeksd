import * as ts from 'typescript';
import {
  FieldDefinition,
  TypeNode,
  TableDefinition,
  Annotation,
  Annotations,
} from '../parser';
import { typeForTypeNode } from './types';

export type IndexKind = 'autoincrement' | 'key' | 'index';

export type TableIndex = Readonly<{
  indexKind: IndexKind;
  name: string;
  type: TypeNode;
}>;

export function doAnnotationsInclude(
  annotations: ReadonlyArray<Annotation>,
  names: ReadonlyArray<string>,
): boolean {
  return annotationsFromList(annotations, names) != null;
}

export function annotationsFromList(
  annotations: ReadonlyArray<Annotation>,
  names: ReadonlyArray<string>,
): string | null {
  for (const annotation of annotations) {
    if (names.includes(annotation.name.value)) {
      return annotation.name.value;
    }
  }

  return null;
}

export function getIndexesForTable(
  def: TableDefinition,
): ReadonlyArray<TableIndex> {
  const indexFields = def.body.filter((next) => {
    return annotationsFromList(next.annotations, [
      'autoincrement',
      'index',
      'key',
    ]);
  });

  return indexFields.map((next) => {
    return {
      indexKind: annotationsFromList(next.annotations, ['autoincrement', 'key'])
        ? 'key'
        : 'index',
      name: next.name.value,
      type: next.type,
    };
  });
}

export function getAutoIncrementFieldForTable(
  def: TableDefinition,
): FieldDefinition | null {
  const keys = def.body.filter((field) => {
    return annotationsFromList(field.annotations, ['autoincrement']);
  });

  if (keys.length > 1) {
    throw new Error(
      `Only one autoincrement key is supported per table, but found ${keys.length}`,
    );
  }

  return keys.length ? keys[0] : null;
}

export function isPrimaryKey(tableIndex: TableIndex): boolean {
  return ['autoincrement', 'key'].includes(tableIndex.indexKind);
}

export function isAutoIncrementField(def: FieldDefinition): boolean {
  return doAnnotationsInclude(def.annotations, ['autoincrement']);
}

export function getPrimaryKeyFieldForTable(
  def: TableDefinition,
): FieldDefinition {
  const keys = def.body.filter((field) => {
    return annotationsFromList(field.annotations, ['autoincrement', 'key']);
  });

  if (keys.length > 1) {
    throw new Error(
      `Only one primary key is supported per table, but found ${keys.length}`,
    );
  }

  return keys[0];
}

export function getIndexFieldsForTable(
  def: TableDefinition,
): ReadonlyArray<FieldDefinition> {
  return def.body.filter((next) =>
    annotationsFromList(next.annotations, ['index']),
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

export function getPrimaryKeyTypeForTable(def: TableDefinition): ts.TypeNode {
  const keyField = getPrimaryKeyFieldForTable(def);
  return typeForTypeNode(keyField.type);
}
