import * as ts from 'typescript';
import { DatabaseDefinition } from '../../parser';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { createBooleanType, createNumberType } from '../types';
import { createAddMethodSignature } from './addMethod';
import { clientTypeNameForTable, createDatabaseClientName } from './common';
import { createGetMethodSignaturesForTable } from './getMethod';
import { createPutMethodSignature } from './putMethod';

type AvailableOptions =
  | 'transaction'
  | 'with_joins_true'
  | 'with_joins_false'
  | 'with_joins_none'
  | 'with_joins_default'
  | 'count';

type OptionDeclarationArgs = Readonly<{
  optional: boolean;
  includes: ReadonlyArray<AvailableOptions>;
}>;

export function createOptionsParameterDeclaration(
  args: OptionDeclarationArgs,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.options,
    args.optional
      ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
      : undefined,
    createOptionsTypeNode(args.includes),
  );
}

export function createOptionsTypeNode(
  options: ReadonlyArray<AvailableOptions>,
): ts.TypeLiteralNode {
  const properties: Array<ts.PropertySignature> = [];
  new Set<AvailableOptions>([...options]).forEach((next) => {
    switch (next) {
      case 'transaction':
        properties.push(createTransactionOptionPropertySignature());
        break;
      case 'with_joins_default':
        properties.push(createWithJoinsBooleanPropertySignature());
        break;
      case 'with_joins_true':
        properties.push(createWithJoinsTruePropertySignature());
        break;
      case 'with_joins_false':
        properties.push(createWithJoinsFalsePropertySignature());
        break;
      case 'with_joins_none':
        break;
      case 'count':
        properties.push(createCountOptionPropertySignature());
        break;
    }
  });
  return ts.factory.createTypeLiteralNode(properties);
}

function createCountOptionPropertySignature(): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined,
    COMMON_IDENTIFIERS.count,
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    createNumberType(),
  );
}

function createTransactionOptionPropertySignature(): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined,
    COMMON_IDENTIFIERS.transaction,
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBTransaction),
  );
}

function createWithJoinsBooleanPropertySignature(): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined,
    COMMON_IDENTIFIERS.withJoins,
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    createBooleanType(),
  );
}

function createWithJoinsTruePropertySignature(): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined,
    COMMON_IDENTIFIERS.withJoins,
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    ts.factory.createLiteralTypeNode(ts.factory.createTrue()),
  );
}

function createWithJoinsFalsePropertySignature(): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined,
    COMMON_IDENTIFIERS.withJoins,
    undefined,
    ts.factory.createLiteralTypeNode(ts.factory.createFalse()),
  );
}

export function createClientTypeDeclaration(
  database: DatabaseDefinition,
): ReadonlyArray<ts.TypeAliasDeclaration> {
  return [
    ...database.body.map((table) => {
      return ts.factory.createTypeAliasDeclaration(
        undefined,
        [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
        ts.factory.createIdentifier(clientTypeNameForTable(table)),
        undefined,
        ts.factory.createTypeLiteralNode([
          createAddMethodSignature(table),
          createPutMethodSignature(table),
          ...createGetMethodSignaturesForTable({
            table,
            database,
            methodName: 'get',
          }),
          ...createGetMethodSignaturesForTable({
            table,
            database,
            methodName: 'getAll',
          }),
        ]),
      );
    }),
    ts.factory.createTypeAliasDeclaration(
      undefined,
      [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(createDatabaseClientName(database)),
      undefined,
      ts.factory.createTypeLiteralNode([
        ts.factory.createPropertySignature(
          undefined,
          COMMON_IDENTIFIERS.transaction,
          undefined,
          ts.factory.createFunctionTypeNode(
            undefined,
            createParameterDeclarationsForTransaction(database),
            ts.factory.createTypeReferenceNode(
              COMMON_IDENTIFIERS.IDBTransaction,
            ),
          ),
        ),
        ...database.body.map((table) => {
          return ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(table.name.value.toLowerCase()),
            undefined,
            ts.factory.createTypeReferenceNode(clientTypeNameForTable(table)),
          );
        }),
      ]),
    ),
  ];
}

export function createParameterDeclarationsForTransaction(
  database: DatabaseDefinition,
): ReadonlyArray<ts.ParameterDeclaration> {
  return [
    ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      COMMON_IDENTIFIERS.storeNames,
      undefined,
      ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Array, [
        ts.factory.createUnionTypeNode(
          database.body.map((next) => {
            return ts.factory.createLiteralTypeNode(
              ts.factory.createStringLiteral(next.name.value),
            );
          }),
        ),
      ]),
      undefined,
    ),
    ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      undefined,
      COMMON_IDENTIFIERS.mode,
      ts.factory.createToken(ts.SyntaxKind.QuestionToken),
      ts.factory.createTypeReferenceNode(
        COMMON_IDENTIFIERS.IDBTransactionMode,
        [],
      ),
      undefined,
    ),
  ];
}
