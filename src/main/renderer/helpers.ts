import * as ts from 'typescript';
import { COMMON_IDENTIFIERS } from '../identifiers';

export function createNewPromiseWithBody(body: ts.Block): ts.NewExpression {
  return ts.factory.createNewExpression(COMMON_IDENTIFIERS.Promise, undefined, [
    ts.factory.createArrowFunction(
      undefined,
      undefined,
      [
        createParameterDeclaration(COMMON_IDENTIFIERS.resolve),
        createParameterDeclaration(COMMON_IDENTIFIERS.reject),
      ],
      undefined,
      undefined,
      body,
    ),
  ]);
}

function createVariableStatement(
  kind: 'const' | 'let',
  variableName: ts.Identifier,
  variableType: ts.TypeNode | undefined,
  initializer: ts.Expression | undefined,
): ts.Statement {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          variableName,
          undefined,
          variableType,
          initializer,
        ),
      ],
      kind === 'const' ? ts.NodeFlags.Const : ts.NodeFlags.Let,
    ),
  );
}

export function createLetStatement(
  variableName: ts.Identifier,
  variableType: ts.TypeNode | undefined,
  initializer: ts.Expression | undefined,
): ts.Statement {
  return createVariableStatement(
    'let',
    variableName,
    variableType,
    initializer,
  );
}

export function createConstStatement(
  variableName: ts.Identifier,
  variableType: ts.TypeNode | undefined,
  initializer: ts.Expression | undefined,
): ts.Statement {
  return createVariableStatement(
    'const',
    variableName,
    variableType,
    initializer,
  );
}

export function createParameterDeclaration(
  name: ts.Identifier,
): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    undefined,
    name,
    undefined,
    undefined,
    undefined,
  );
}
