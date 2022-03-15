import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../../identifiers';
import { FieldDefinition, TableDefinition } from '../../parser';
import {
  createConstStatement,
  createLetStatement,
  createNewPromiseWithBody,
} from '../helpers';
import {
  getIndexesForTable,
  getIndexFieldsForTable,
  TableIndex,
} from '../keys';
import { createNumberType, createStringType, typeForTypeNode } from '../types';
import { capitalize } from '../utils';
import { createOnErrorHandler, createOnSuccessHandler } from './common';
import { createGetObjectStore } from './objectStore';
import { createTransactionWithMode } from './transaction';
import { getItemNameForTable } from './type';

export function createGetArgsTypeName(def: TableDefinition): string {
  return `${capitalize(def.name.value)}GetArgs`;
}

function createGetArgsTypeNode(def: TableDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(getItemNameForTable(def));
}

export function createGetMethod(def: TableDefinition): ts.PropertyAssignment {
  return ts.factory.createPropertyAssignment(
    'get',
    ts.factory.createArrowFunction(
      undefined,
      undefined,
      [
        ts.factory.createParameterDeclaration(
          undefined,
          undefined,
          undefined,
          ts.factory.createIdentifier('arg'),
          undefined,
          ts.factory.createTypeReferenceNode(createGetArgsTypeName(def)),
        ),
      ],
      ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Promise, [
        createGetArgsTypeNode(def),
      ]),
      undefined,
      ts.factory.createBlock(
        [
          ts.factory.createReturnStatement(
            createNewPromiseWithBody(
              ts.factory.createBlock(
                [
                  createTransactionWithMode(def.name.value, 'readwrite'),
                  createGetObjectStore(def.name.value),
                  ...createIndexAccessHandling(def),
                ],
                true,
              ),
            ),
          ),
        ],
        true,
      ),
    ),
  );
}

function createConditionsForIndexes(
  def: TableDefinition,
  indexes: ReadonlyArray<TableIndex>,
  keys: ReadonlyArray<TableIndex>,
): ReadonlyArray<ts.Statement> {
  if (indexes.length > 0) {
    const [next, ...remaining] = indexes;
    return [
      ts.factory.createIfStatement(
        ts.factory.createCallExpression(
          ts.factory.createIdentifier(createPredicateNameForIndex(def, next)),
          undefined,
          [ts.factory.createIdentifier('arg')],
        ),
        ts.factory.createBlock(
          [
            createConstStatement(
              ts.factory.createIdentifier('index'),
              ts.factory.createTypeReferenceNode('IDBIndex', undefined),
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createIdentifier('store'),
                  'index',
                ),
                undefined,
                [ts.factory.createStringLiteral(next.name)],
              ),
            ),
            ts.factory.createExpressionStatement(
              ts.factory.createAssignment(
                ts.factory.createIdentifier('getRequest'),
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier('index'),
                    'get',
                  ),
                  undefined,
                  [ts.factory.createIdentifier('arg')],
                ),
              ),
            ),
          ],
          true,
        ),
        createConditionsForIndexes(def, remaining, keys)[0],
      ),
    ];
  } else if (keys.length > 0) {
    return [
      ts.factory.createBlock(
        [
          ts.factory.createExpressionStatement(
            ts.factory.createAssignment(
              ts.factory.createIdentifier('getRequest'),
              ts.factory.createCallExpression(
                ts.factory.createPropertyAccessExpression(
                  ts.factory.createIdentifier('store'),
                  'get',
                ),
                undefined,
                [ts.factory.createIdentifier('arg')],
              ),
            ),
          ),
        ],
        true,
      ),
    ];
  } else {
    return [];
  }
}

function createIndexAccessHandling(
  def: TableDefinition,
): ReadonlyArray<ts.Statement> {
  const indexesAndKeys = getIndexesForTable(def);
  const indexes = indexesAndKeys.filter(
    (next) => next.indexKind !== 'autoincrement',
  );
  const keys = indexesAndKeys.filter((next) => next.indexKind !== 'index');

  return [
    createLetStatement(
      ts.factory.createIdentifier('getRequest'),
      ts.factory.createTypeReferenceNode('IDBRequest'),
      undefined,
    ),
    ...createConditionsForIndexes(def, indexes, keys),
    createOnErrorHandler('getRequest'),
    createOnSuccessHandler('getRequest'),
  ];
}

function createPredicateNameForIndex(
  def: TableDefinition,
  field: TableIndex,
): string {
  return `is${capitalize(def.name.value)}${capitalize(field.name)}Index`;
}

export function createIndexPredicates(
  def: TableDefinition,
): ReadonlyArray<ts.Statement> {
  const indexes = getIndexesForTable(def);

  return indexes.map((next) => {
    return createConstStatement(
      ts.factory.createIdentifier(createPredicateNameForIndex(def, next)),
      undefined,
      ts.factory.createArrowFunction(
        undefined,
        undefined,
        [
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            'arg',
            undefined,
            createGetArgsTypeNode(def),
            undefined,
          ),
        ],
        ts.factory.createTypePredicateNode(
          undefined,
          ts.factory.createIdentifier('arg'),
          typeNodeForIndex(next),
        ),
        undefined,
        ts.factory.createBlock(
          [
            ts.factory.createReturnStatement(
              ts.factory.createBinaryExpression(
                ts.factory.createBinaryExpression(
                  ts.factory.createTypeOfExpression(
                    ts.factory.createIdentifier('arg'),
                  ),
                  ts.SyntaxKind.EqualsEqualsEqualsToken,
                  ts.factory.createStringLiteral('object'),
                ),
                ts.SyntaxKind.AmpersandAmpersandToken,
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createIdentifier('Reflect'),
                    'has',
                  ),
                  undefined,
                  [
                    ts.factory.createIdentifier('arg'),
                    ts.factory.createStringLiteral(next.name),
                  ],
                ),
              ),
            ),
          ],
          true,
        ),
      ),
    );
  });
}

// function createPredicateForIndex() {
//   // createTypePredicateNode
//   // createTypeOfExpression
// }

function typeNodeForIndex(index: TableIndex): ts.TypeNode {
  switch (index.indexKind) {
    case 'autoincrement':
      return createNumberType();
    case 'index':
      return ts.factory.createTypeLiteralNode([
        ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(index.name),
          undefined,
          typeForTypeNode(index.type),
        ),
      ]);
    default:
      const _exhaustiveCheck: never = index.indexKind;
      throw new Error(
        `Non-exhaustive check for index kind ${_exhaustiveCheck}`,
      );
  }
}

export function createGetArgsType(
  def: TableDefinition,
): ts.TypeAliasDeclaration {
  const indexes = getIndexesForTable(def);

  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(createGetArgsTypeName(def)),
    [],
    ts.factory.createUnionTypeNode(
      indexes.map((next) => {
        return typeNodeForIndex(next);
      }),
    ),
  );
}
