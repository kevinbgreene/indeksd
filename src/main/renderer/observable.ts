import * as ts from 'typescript';
import { TableDefinition } from '../parser';
import { getItemTypeForTable } from './common';
import { createConstStatement } from './helpers';
import { COMMON_IDENTIFIERS } from './identifiers';
import { getPrimaryKeyTypeForTable } from './keys';
import { createNumberType, createStringType, createVoidType } from './types';

function createSubscriptionEventTypeReference(
  itemType: ts.TypeNode = ts.factory.createTypeReferenceNode(
    COMMON_IDENTIFIERS.ItemType,
  ),
  keyType: ts.TypeNode = ts.factory.createTypeReferenceNode(
    COMMON_IDENTIFIERS.PrimaryKeyType,
  ),
): ts.TypeReferenceNode {
  return ts.factory.createTypeReferenceNode(
    COMMON_IDENTIFIERS.SubscriptionEvent,
    [itemType, keyType],
  );
}

function createSubscriptionCallbackType(
  itemType?: ts.TypeNode,
  keyType?: ts.TypeNode,
): ts.TypeNode {
  return ts.factory.createFunctionTypeNode(
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.event,
        undefined,
        createSubscriptionEventTypeReference(itemType, keyType),
      ),
    ],
    createVoidType(),
  );
}

function createMapType(
  keyType: ts.TypeNode,
  valueType: ts.TypeNode,
): ts.TypeNode {
  return ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Map, [
    keyType,
    valueType,
  ]);
}

export function createObservableClass(): ts.ClassDeclaration {
  return ts.factory.createClassDeclaration(
    undefined,
    undefined,
    COMMON_IDENTIFIERS.Observable,
    [
      ts.factory.createTypeParameterDeclaration(
        COMMON_IDENTIFIERS.ItemType,
        undefined,
        undefined,
      ),
      ts.factory.createTypeParameterDeclaration(
        COMMON_IDENTIFIERS.PrimaryKeyType,
        undefined,
        undefined,
      ),
    ],
    undefined,
    [
      ts.factory.createPropertyDeclaration(
        undefined,
        undefined,
        COMMON_IDENTIFIERS.listeners,
        undefined,
        createMapType(
          createStringType(),
          createMapType(createNumberType(), createSubscriptionCallbackType()),
        ),
        ts.factory.createNewExpression(COMMON_IDENTIFIERS.Map, undefined, []),
      ),
      ts.factory.createPropertyDeclaration(
        undefined,
        undefined,
        COMMON_IDENTIFIERS.nextId,
        undefined,
        createNumberType(),
        ts.factory.createNumericLiteral(0),
      ),
      createSubscribeMethodDeclaration(),
      ts.factory.createMethodDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS._push,
        undefined,
        undefined,
        [
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            COMMON_IDENTIFIERS.eventName,
            undefined,
            ts.factory.createLiteralTypeNode(
              ts.factory.createStringLiteral('delete'),
            ),
            undefined,
          ),
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            COMMON_IDENTIFIERS.data,
            undefined,
            ts.factory.createTypeReferenceNode(
              COMMON_IDENTIFIERS.PrimaryKeyType,
            ),
            undefined,
          ),
        ],
        createVoidType(),
        undefined,
      ),
      ts.factory.createMethodDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS._push,
        undefined,
        undefined,
        [
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            COMMON_IDENTIFIERS.eventName,
            undefined,
            ts.factory.createUnionTypeNode([
              ts.factory.createLiteralTypeNode(
                ts.factory.createStringLiteral('add'),
              ),
              ts.factory.createLiteralTypeNode(
                ts.factory.createStringLiteral('put'),
              ),
            ]),
            undefined,
          ),
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            COMMON_IDENTIFIERS.data,
            undefined,
            ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.ItemType),
            undefined,
          ),
        ],
        createVoidType(),
        undefined,
      ),
      ts.factory.createMethodDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS._push,
        undefined,
        undefined,
        [
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            COMMON_IDENTIFIERS.eventName,
            undefined,
            ts.factory.createUnionTypeNode([
              ts.factory.createLiteralTypeNode(
                ts.factory.createStringLiteral('add'),
              ),
              ts.factory.createLiteralTypeNode(
                ts.factory.createStringLiteral('put'),
              ),
              ts.factory.createLiteralTypeNode(
                ts.factory.createStringLiteral('delete'),
              ),
            ]),
            undefined,
          ),
          ts.factory.createParameterDeclaration(
            undefined,
            undefined,
            undefined,
            COMMON_IDENTIFIERS.data,
            undefined,
            ts.factory.createUnionTypeNode([
              ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.ItemType),
              ts.factory.createTypeReferenceNode(
                COMMON_IDENTIFIERS.PrimaryKeyType,
              ),
            ]),
            undefined,
          ),
        ],
        createVoidType(),
        ts.factory.createBlock(
          [
            ts.factory.createExpressionStatement(
              ts.factory.createCallChain(
                ts.factory.createPropertyAccessChain(
                  ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createThis(),
                        COMMON_IDENTIFIERS.listeners,
                      ),
                      COMMON_IDENTIFIERS.get,
                    ),
                    undefined,
                    [ts.factory.createStringLiteral('change')],
                  ),
                  ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
                  COMMON_IDENTIFIERS.forEach,
                ),
                ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
                undefined,
                [createNotifyListenersFunction()],
              ),
            ),
            ts.factory.createExpressionStatement(
              ts.factory.createCallChain(
                ts.factory.createPropertyAccessChain(
                  ts.factory.createCallExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createThis(),
                        COMMON_IDENTIFIERS.listeners,
                      ),
                      COMMON_IDENTIFIERS.get,
                    ),
                    undefined,
                    [COMMON_IDENTIFIERS.eventName],
                  ),
                  ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
                  COMMON_IDENTIFIERS.forEach,
                ),
                ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
                undefined,
                [createNotifyListenersFunction()],
              ),
            ),
          ],
          true,
        ),
      ),
    ],
  );
}

export function createSubscribeMethodSignatureForTable(
  table: TableDefinition,
): ts.MethodSignature {
  return ts.factory.createMethodSignature(
    undefined,
    COMMON_IDENTIFIERS.subscribe,
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.eventName,
        undefined,
        ts.factory.createUnionTypeNode([
          ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral('change'),
          ),
          ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral('add'),
          ),
          ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral('put'),
          ),
          ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral('delete'),
          ),
        ]),
        undefined,
      ),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.callback,
        undefined,
        createSubscriptionCallbackType(
          getItemTypeForTable(table),
          getPrimaryKeyTypeForTable(table),
        ),
        undefined,
      ),
    ],
    createVoidType(),
  );
}

function createSubscribeMethodDeclaration(): ts.MethodDeclaration {
  return ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    undefined,
    COMMON_IDENTIFIERS.subscribe,
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.eventName,
        undefined,
        ts.factory.createUnionTypeNode([
          ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral('change'),
          ),
          ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral('add'),
          ),
          ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral('put'),
          ),
          ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral('delete'),
          ),
        ]),
        undefined,
      ),
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.callback,
        undefined,
        createSubscriptionCallbackType(),
        undefined,
      ),
    ],
    createVoidType(),
    ts.factory.createBlock(
      [
        ts.factory.createIfStatement(
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createPropertyAccessExpression(
                ts.factory.createThis(),
                COMMON_IDENTIFIERS.listeners,
              ),
              COMMON_IDENTIFIERS.has,
            ),
            undefined,
            [COMMON_IDENTIFIERS.eventName],
          ),
          ts.factory.createBlock(
            [
              ts.factory.createExpressionStatement(
                ts.factory.createCallChain(
                  ts.factory.createPropertyAccessChain(
                    ts.factory.createCallExpression(
                      ts.factory.createPropertyAccessExpression(
                        ts.factory.createPropertyAccessExpression(
                          ts.factory.createThis(),
                          COMMON_IDENTIFIERS.listeners,
                        ),
                        COMMON_IDENTIFIERS.get,
                      ),
                      undefined,
                      [COMMON_IDENTIFIERS.eventName],
                    ),
                    ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
                    COMMON_IDENTIFIERS.set,
                  ),
                  ts.factory.createToken(ts.SyntaxKind.QuestionDotToken),
                  undefined,
                  [
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createThis(),
                      COMMON_IDENTIFIERS.nextId,
                    ),
                    COMMON_IDENTIFIERS.callback,
                  ],
                ),
              ),
            ],
            true,
          ),
          ts.factory.createBlock(
            [
              createConstStatement(
                COMMON_IDENTIFIERS.innerMap,
                ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.Map, [
                  createNumberType(),
                  createSubscriptionCallbackType(),
                ]),
                ts.factory.createNewExpression(
                  COMMON_IDENTIFIERS.Map,
                  undefined,
                  [],
                ),
              ),
              ts.factory.createExpressionStatement(
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    COMMON_IDENTIFIERS.innerMap,
                    COMMON_IDENTIFIERS.set,
                  ),
                  undefined,
                  [
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createThis(),
                      COMMON_IDENTIFIERS.nextId,
                    ),
                    COMMON_IDENTIFIERS.callback,
                  ],
                ),
              ),
              ts.factory.createExpressionStatement(
                ts.factory.createCallExpression(
                  ts.factory.createPropertyAccessExpression(
                    ts.factory.createPropertyAccessExpression(
                      ts.factory.createThis(),
                      COMMON_IDENTIFIERS.listeners,
                    ),
                    COMMON_IDENTIFIERS.set,
                  ),
                  undefined,
                  [COMMON_IDENTIFIERS.eventName, COMMON_IDENTIFIERS.innerMap],
                ),
              ),
            ],
            true,
          ),
        ),
        ts.factory.createExpressionStatement(
          ts.factory.createBinaryExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createThis(),
              COMMON_IDENTIFIERS.nextId,
            ),
            ts.SyntaxKind.PlusEqualsToken,
            ts.factory.createNumericLiteral(1),
          ),
        ),
      ],
      true,
    ),
  );
}

function createNotifyListenersFunction(): ts.ArrowFunction {
  return ts.factory.createArrowFunction(
    undefined,
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        COMMON_IDENTIFIERS.callback,
        undefined,
        undefined,
        undefined,
      ),
    ],
    undefined,
    undefined,
    ts.factory.createBlock(
      [
        ts.factory.createExpressionStatement(
          ts.factory.createCallExpression(
            COMMON_IDENTIFIERS.callback,
            undefined,
            [
              ts.factory.createAsExpression(
                ts.factory.createObjectLiteralExpression([
                  ts.factory.createPropertyAssignment(
                    COMMON_IDENTIFIERS.type,
                    COMMON_IDENTIFIERS.eventName,
                  ),
                  ts.factory.createShorthandPropertyAssignment(
                    COMMON_IDENTIFIERS.data,
                  ),
                ]),
                createSubscriptionEventTypeReference(),
              ),
            ],
          ),
        ),
      ],
      true,
    ),
  );
}

export function createSubscriptionTypeDeclaration(): ts.TypeAliasDeclaration {
  return ts.factory.createTypeAliasDeclaration(
    undefined,
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    COMMON_IDENTIFIERS.SubscriptionEvent,
    [
      ts.factory.createTypeParameterDeclaration(
        COMMON_IDENTIFIERS.ItemType,
        undefined,
        undefined,
      ),
      ts.factory.createTypeParameterDeclaration(
        COMMON_IDENTIFIERS.PrimaryKeyType,
        undefined,
        undefined,
      ),
    ],
    ts.factory.createUnionTypeNode([
      ts.factory.createTypeLiteralNode([
        ts.factory.createPropertySignature(
          undefined,
          COMMON_IDENTIFIERS.type,
          undefined,
          ts.factory.createUnionTypeNode([
            ts.factory.createLiteralTypeNode(
              ts.factory.createStringLiteral('add'),
            ),
            ts.factory.createLiteralTypeNode(
              ts.factory.createStringLiteral('put'),
            ),
          ]),
        ),
        ts.factory.createPropertySignature(
          undefined,
          COMMON_IDENTIFIERS.data,
          undefined,
          ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.ItemType),
        ),
      ]),
      ts.factory.createTypeLiteralNode([
        ts.factory.createPropertySignature(
          undefined,
          COMMON_IDENTIFIERS.type,
          undefined,
          ts.factory.createLiteralTypeNode(
            ts.factory.createStringLiteral('delete'),
          ),
        ),
        ts.factory.createPropertySignature(
          undefined,
          COMMON_IDENTIFIERS.data,
          undefined,
          ts.factory.createTypeReferenceNode(COMMON_IDENTIFIERS.PrimaryKeyType),
        ),
      ]),
    ]),
  );
}

export function createPushMethodCall(
  eventName: 'add' | 'put' | 'delete',
  data: ts.Identifier,
): ts.ExpressionStatement {
  return ts.factory.createExpressionStatement(
    ts.factory.createCallExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createThis(),
        COMMON_IDENTIFIERS._push,
      ),
      undefined,
      [ts.factory.createStringLiteral(eventName), data],
    ),
  );
}
