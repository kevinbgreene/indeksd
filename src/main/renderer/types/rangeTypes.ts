import * as ts from 'typescript';
import { RangeTypeNode } from '../../parser';

export function createRangeType(typeNode: RangeTypeNode): ts.UnionTypeNode {
  const rangeTypes = [];
  const startValue = parseInt(typeNode.startValue.value);
  const endValue = parseInt(typeNode.endValue.value);
  for (let i = startValue; i <= endValue; i++) {
    rangeTypes.push(
      ts.factory.createLiteralTypeNode(ts.factory.createNumericLiteral(i)),
    );
  }
  return ts.factory.createUnionTypeNode(rangeTypes);
}
