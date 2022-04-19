import * as ts from 'typescript';

export const COMMON_IDENTIFIERS = {
  arg: ts.factory.createIdentifier('arg'),
  db: ts.factory.createIdentifier('db'),
  // event: ts.factory.createIdentifier('event'),
  count: ts.factory.createIdentifier('count'),
  globalThis: ts.factory.createIdentifier('globalThis'),
  addRequest: ts.factory.createIdentifier('addRequest'),
  get: ts.factory.createIdentifier('get'),
  getAll: ts.factory.createIdentifier('getAll'),
  getRequest: ts.factory.createIdentifier('getRequest'),
  undefined: ts.factory.createIdentifier('undefined'),
  // methodName: ts.factory.createIdentifier('methodName'),
  options: ts.factory.createIdentifier('options'),
  onerror: ts.factory.createIdentifier('onerror'),
  onsuccess: ts.factory.createIdentifier('onsuccess'),
  resolve: ts.factory.createIdentifier('resolve'),
  reject: ts.factory.createIdentifier('reject'),
  result: ts.factory.createIdentifier('result'),
  transaction: ts.factory.createIdentifier('transaction'),
  withJoins: ts.factory.createIdentifier('withJoins'),
  Array: ts.factory.createIdentifier('Array'),
  IDBDatabase: ts.factory.createIdentifier('IDBDatabase'),
  IDBRequest: ts.factory.createIdentifier('IDBRequest'),
  IDBTransaction: ts.factory.createIdentifier('IDBTransaction'),
  DBOpenRequest: ts.factory.createIdentifier('DBOpenRequest'),
  Map: ts.factory.createIdentifier('Map'),
  Object: ts.factory.createIdentifier('Object'),
  Promise: ts.factory.createIdentifier('Promise'),
  Reflect: ts.factory.createIdentifier('Reflect'),
  Set: ts.factory.createIdentifier('Set'),
  ReadonlyArray: ts.factory.createIdentifier('ReadonlyArray'),
};
