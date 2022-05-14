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

const PRIMARY_KEY_ANNOTATIONS = ['autoincrement', 'key'];

const INDEX_ANNOTATIONS: ReadonlyArray<string> = [
  ...PRIMARY_KEY_ANNOTATIONS,
  'index',
];

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

function isIndexAnnotation(arg: string): arg is IndexKind {
  return INDEX_ANNOTATIONS.includes(arg);
}

function getIndexAnnotationsForField(
  field: FieldDefinition,
): ReadonlyArray<Annotation> {
  return field.annotations.reduce<Array<Annotation>>((acc, next) => {
    if (isIndexAnnotation(next.name.value)) {
      acc.push(next);
    }
    return acc;
  }, []);
}

export type TableIndexMap = Readonly<{
  key: TableIndex | null;
  indexes: ReadonlyArray<TableIndex>;
}>;

export type TableIndex = Readonly<{
  kind: IndexKind;
  name: string;
  fields: ReadonlyArray<FieldDefinition>;
}>;

export function getIndexesForTable(table: TableDefinition): TableIndexMap {
  const indexes: {
    [name: string]: {
      kind: IndexKind;
      name: string;
      fields: Array<FieldDefinition>;
    };
  } = {};
  table.body.forEach((field: FieldDefinition) => {
    const indexesForField: {
      [name: string]: {
        kind: IndexKind;
        name: string;
        field: FieldDefinition;
      };
    } = {};
    const annotations = getIndexAnnotationsForField(field);
    annotations.forEach((annotation) => {
      const annotationName = annotation.name.value;
      switch (annotationName) {
        case 'index': {
          const args = annotation.arguments;
          const indexName = args[0]?.value ?? field.name.value;
          if (indexesForField[indexName] !== undefined) {
            throw new Error(
              `Multiple definitions of index "${indexName}" on field ${field.name.value}`,
            );
          }

          indexesForField[indexName] = {
            kind: 'index',
            name: indexName,
            field,
          };
          break;
        }
        case 'key': {
          if (indexesForField['key'] !== undefined) {
            throw new Error(
              `Multiple definitions of index "key" on field ${field.name.value}`,
            );
          }
          indexesForField['key'] = {
            kind: 'key',
            name: field.name.value,
            field,
          };
          break;
        }
        case 'autoincrement': {
          if (indexesForField['autoincrement'] !== undefined) {
            throw new Error(
              `Multiple definitions of index "autoincrement" on field ${field.name.value}`,
            );
          }

          indexesForField['autoincrement'] = {
            kind: 'autoincrement',
            name: field.name.value,
            field,
          };
          break;
        }
      }
    });

    Object.entries(indexesForField).forEach(([key, value]) => {
      if (indexes[key]) {
        indexes[key].fields = [...indexes[key].fields, value.field];
      } else {
        indexes[key] = {
          kind: value.kind,
          name: value.name,
          fields: [value.field],
        };
      }
    });
  });

  return Object.values(indexes).reduce(
    (
      acc: {
        key: TableIndex | null;
        indexes: Array<TableIndex>;
      },
      value,
    ) => {
      switch (value.kind) {
        case 'autoincrement':
        case 'key':
          acc['key'] = value;
          break;
        case 'index':
          acc['indexes'].push(value);
      }
      return acc;
    },
    { key: null, indexes: [] },
  );
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
  return ['autoincrement', 'key'].includes(tableIndex.kind);
}

export function isAutoIncrementField(def: FieldDefinition): boolean {
  return doAnnotationsInclude(def.annotations, ['autoincrement']);
}

export function getPrimaryKeyFieldForTable(
  def: TableDefinition,
): FieldDefinition {
  const keys = def.body.filter((field) => {
    return annotationsFromList(field.annotations, PRIMARY_KEY_ANNOTATIONS);
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

export function getPrimaryKeyTypeForTable(table: TableDefinition): ts.TypeNode {
  const keyField = getPrimaryKeyFieldForTable(table);
  return typeForTypeNode(keyField.type);
}

export function getPrimaryKeyTypeForTableAsString(
  table: TableDefinition,
): string {
  const keyField = getPrimaryKeyFieldForTable(table);

  switch (keyField.type.kind) {
    case 'StringKeyword':
      return 'string';
    case 'NumberKeyword':
      return 'number';
    default:
      throw new Error(
        `Primary key for table must be "string" or "number". Found ${keyField.type.kind} for field ${keyField.name.value}`,
      );
  }
}
