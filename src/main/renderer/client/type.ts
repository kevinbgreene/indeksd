import * as ts from 'typescript';
import { DatabaseDefinition } from '../../parser';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { TableJoin } from '../joins';
import { createBooleanType, createNumberType } from '../types';
import { createAddMethodSignature } from './addMethod';
import { createDatabaseClientName } from './common';
import { createGetMethodSignaturesForTable } from './getMethod';

// function createBaseOptionsTypeDeclaration(
//   joins: ReadonlyArray<TableJoin>,
// ): ts.TypeAliasDeclaration {
//   return ts.factory.createTypeAliasDeclaration(
//     undefined,
//     undefined,
//     ts.factory.createIdentifier('OperationOptions'),
//     undefined,
//     createOptionsTypeNode(),
//   );
// }

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

// export function createOptionsTypeNode(): ts.TypeNode {
//   const properties: Array<ts.PropertySignature> = [
//     createTransactionOptionPropertySignature(),
//   ];

//   return ts.factory.createTypeLiteralNode(properties);
// }

export function createClientTypeDeclaration(
  database: DatabaseDefinition,
): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(createDatabaseClientName(database)),
    undefined,
    ts.factory.createTypeLiteralNode(
      database.body.map((table) => {
        return ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(table.name.value.toLowerCase()),
          undefined,
          ts.factory.createTypeLiteralNode([
            createAddMethodSignature(table),
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
    ),
  );
}
