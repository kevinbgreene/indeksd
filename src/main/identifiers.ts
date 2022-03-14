import * as ts from 'typescript';

export const COMMON_IDENTIFIERS = {
  event: ts.factory.createIdentifier('event'),
  globalThis: ts.factory.createIdentifier('globalThis'),
  undefined: ts.factory.createIdentifier('undefined'),
  onerror: ts.factory.createIdentifier('onerror'),
  onsuccess: ts.factory.createIdentifier('onsuccess'),
  resolve: ts.factory.createIdentifier('resolve'),
  reject: ts.factory.createIdentifier('reject'),
  addRequest: ts.factory.createIdentifier('addRequest'),
  Array: ts.factory.createIdentifier('Array'),
  DBOpenRequest: ts.factory.createIdentifier('DBOpenRequest'),
  Map: ts.factory.createIdentifier('Map'),
  Promise: ts.factory.createIdentifier('Promise'),
  Set: ts.factory.createIdentifier('Set'),
};
