import * as ts from 'typescript';
import { Expression } from '../parser';

export function renderExpression(expression: Expression): ts.Expression {
  switch (expression.kind) {
    case 'Identifier':
      return ts.factory.createIdentifier(expression.value);
    case 'StringLiteral':
      return ts.factory.createStringLiteral(expression.value);
    case 'FloatLiteral':
    case 'IntegerLiteral':
      return ts.factory.createNumericLiteral(expression.value);
    case 'BooleanLiteral':
      return expression.value
        ? ts.factory.createTrue()
        : ts.factory.createFalse();
    case 'ObjectLiteral':
      return ts.factory.createObjectLiteralExpression(
        expression.elements.map((next) => {
          return ts.factory.createPropertyAssignment(
            next.key.value,
            renderExpression(next.value),
          );
        }),
        true,
      );
    case 'ArrayLiteral':
      return ts.factory.createArrayLiteralExpression(
        expression.items.map((next) => {
          return renderExpression(next);
        }),
      );
    default:
      const _exhaustiveCheck: never = expression;
      throw new Error(`Unknown expression kind: ${_exhaustiveCheck}`);
  }
}
