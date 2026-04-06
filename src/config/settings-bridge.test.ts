import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function getObjectLiteralProperty(sourceFile: ts.SourceFile, objectName: string, propertyName: string) {
  let objectLiteral: ts.ObjectLiteralExpression | undefined;

  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === objectName) {
      if (node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
        objectLiteral = node.initializer;
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (!objectLiteral) {
    throw new Error(`Could not find ${objectName} object literal`);
  }

  const property = objectLiteral.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) && prop.name.getText(sourceFile) === propertyName
  );

  if (!property) {
    throw new Error(`Could not find ${propertyName} on ${objectName}`);
  }

  return property.initializer;
}

function getIpcChannelCallArgumentText(
  sourceFile: ts.SourceFile,
  initializer: ts.Expression,
  expectedMethodName: string
) {
  if (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) {
    throw new Error(`${expectedMethodName} is not a function`);
  }

  const body = initializer.body;
  if (!ts.isCallExpression(body)) {
    throw new Error(`${expectedMethodName} does not call ipcRenderer.invoke`);
  }

  return body.arguments.map((argument) => argument.getText(sourceFile));
}

describe('settings bridge', () => {
  it('wires the last-vault methods to the expected IPC channels', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const preloadPath = path.resolve(testDir, '..', '..', 'electron', 'preload.cts');
    const preloadSource = readFileSync(preloadPath, 'utf8');
    const sourceFile = ts.createSourceFile(preloadPath, preloadSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    const getLastVaultPathInitializer = getObjectLiteralProperty(
      sourceFile,
      'vaultApi',
      'getLastVaultPath'
    );
    const setLastVaultPathInitializer = getObjectLiteralProperty(
      sourceFile,
      'vaultApi',
      'setLastVaultPath'
    );

    expect(getIpcChannelCallArgumentText(sourceFile, getLastVaultPathInitializer, 'getLastVaultPath')).toEqual([
      "'settings:get-last-vault'"
    ]);
    expect(getIpcChannelCallArgumentText(sourceFile, setLastVaultPathInitializer, 'setLastVaultPath')).toEqual([
      "'settings:set-last-vault'",
      'path'
    ]);
  });
});
