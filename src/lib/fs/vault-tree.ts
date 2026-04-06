import path from 'node:path';
import type { VaultNode } from '../types.js';

type FolderNode = Extract<VaultNode, { kind: 'folder' }>;

function ensureFolder(
  folders: Map<string, FolderNode>,
  roots: VaultNode[],
  rootPath: string,
  folderPath: string
): FolderNode {
  const existing = folders.get(folderPath);
  if (existing) {
    return existing;
  }

  const folder: FolderNode = {
    kind: 'folder',
    name: path.basename(folderPath),
    path: folderPath,
    children: []
  };

  folders.set(folderPath, folder);

  const parentPath = path.dirname(folderPath);
  if (parentPath === rootPath || parentPath === folderPath) {
    roots.push(folder);
  } else {
    ensureFolder(folders, roots, rootPath, parentPath).children.push(folder);
  }

  return folder;
}

export function buildVaultTree(rootPath: string, discoveredPaths: string[]): VaultNode[] {
  const folders = new Map<string, FolderNode>();
  const roots: VaultNode[] = [];

  for (const discoveredPath of discoveredPaths) {
    const relativePath = path.relative(rootPath, discoveredPath);
    if (!relativePath || relativePath.startsWith('..')) {
      continue;
    }

    const extension = path.extname(discoveredPath).toLowerCase();
    const isDirectory = extension === '';

    if (isDirectory) {
      ensureFolder(folders, roots, rootPath, discoveredPath);
      continue;
    }

    if (extension !== '.md') {
      continue;
    }

    const note: VaultNode = {
      kind: 'note',
      name: path.basename(discoveredPath),
      path: discoveredPath
    };

    const parentPath = path.dirname(discoveredPath);
    if (parentPath === rootPath) {
      roots.push(note);
      continue;
    }

    ensureFolder(folders, roots, rootPath, parentPath).children.push(note);
  }

  return roots;
}
