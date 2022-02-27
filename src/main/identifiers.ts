import * as ts from 'typescript';

export const COMMON_IDENTIFIERS = {
  undefined: ts.factory.createIdentifier('undefined'),
  Array: ts.factory.createIdentifier('Array'),
  Map: ts.factory.createIdentifier('Map'),
  Set: ts.factory.createIdentifier('Set'),
};
