import * as ts from 'typescript';

export const COMMON_IDENTIFIERS = {
  arg: ts.factory.createIdentifier('arg'),
  db: ts.factory.createIdentifier('db'),
  event: ts.factory.createIdentifier('event'),
  globalThis: ts.factory.createIdentifier('globalThis'),
  addRequest: ts.factory.createIdentifier('addRequest'),
  getRequest: ts.factory.createIdentifier('getRequest'),
  undefined: ts.factory.createIdentifier('undefined'),
  methodName: ts.factory.createIdentifier('methodName'),
  onerror: ts.factory.createIdentifier('onerror'),
  onsuccess: ts.factory.createIdentifier('onsuccess'),
  resolve: ts.factory.createIdentifier('resolve'),
  reject: ts.factory.createIdentifier('reject'),
  Array: ts.factory.createIdentifier('Array'),
  DBOpenRequest: ts.factory.createIdentifier('DBOpenRequest'),
  Map: ts.factory.createIdentifier('Map'),
  Promise: ts.factory.createIdentifier('Promise'),
  Set: ts.factory.createIdentifier('Set'),
  ReadonlyArray: ts.factory.createIdentifier('ReadonlyArray'),
};
