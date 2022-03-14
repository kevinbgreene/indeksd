import * as ts from 'typescript';
import { DatabaseDefinition } from '../../parser';
import { capitalize } from '../utils';

export function createDatabaseClientName(def: DatabaseDefinition): string {
  return `${capitalize(def.name.value)}Client`;
}

export function createClientTypeNode(def: DatabaseDefinition): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(createDatabaseClientName(def));
}
