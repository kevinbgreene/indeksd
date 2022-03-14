import * as ts from 'typescript';

export function createConstStatement(
  variableName: ts.Identifier,
  variableType: ts.TypeNode | undefined,
  initializer: ts.Expression,
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
      ts.NodeFlags.Const,
    ),
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
