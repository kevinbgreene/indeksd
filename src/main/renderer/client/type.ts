import * as ts from 'typescript';
import { DatabaseDefinition } from '../../parser';
import { COMMON_IDENTIFIERS } from '../identifiers';
import { TableJoin } from '../joins';
import { createBooleanType } from '../types';
import { createAddMethodSignature } from './addMethod';
import { createDatabaseClientName } from './common';
import { createGetMethodSignaturesForTable } from './getMethod';

export function createBaseOptionsTypeDeclaration(
  joins: ReadonlyArray<TableJoin>,
): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    undefined,
    ts.factory.createIdentifier('OperationOptions'),
    undefined,
    createOptionsTypeNode(),
  );
}

export function createTransactionOptionPropertySignature(): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined,
    COMMON_IDENTIFIERS.transaction,
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.IDBTransaction),
  );
}

export function createWithJoinsBooleanPropertySignature(): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined,
    COMMON_IDENTIFIERS.withJoins,
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    createBooleanType(),
  );
}

export function createWithJoinsTruePropertySignature(): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined,
    COMMON_IDENTIFIERS.withJoins,
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    ts.factory.createLiteralTypeNode(ts.factory.createTrue()),
  );
}

export function createWithJoinsFalsePropertySignature(): ts.PropertySignature {
  return ts.factory.createPropertySignature(
    undefined,
    COMMON_IDENTIFIERS.withJoins,
    undefined,
    ts.factory.createLiteralTypeNode(ts.factory.createFalse()),
  );
}

export function createOptionsTypeNode(): ts.TypeNode {
  const properties: Array<ts.PropertySignature> = [
    createTransactionOptionPropertySignature(),
  ];

  return ts.factory.createTypeLiteralNode(properties);
}

export function createOptionsParameterDeclaration(
  joins: ReadonlyArray<TableJoin>,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    ts.factory.createIdentifier('options'),
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    createOptionsTypeNode(),
  );
}

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
