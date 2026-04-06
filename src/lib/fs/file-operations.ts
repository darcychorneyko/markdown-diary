import path from 'node:path';

export function buildNotePath(parentPath: string, name: string) {
  const normalized = name.endsWith('.md') ? name : `${name}.md`;
  return path.join(parentPath, normalized);
}

export function buildRenamedPath(targetPath: string, newName: string) {
  return path.join(path.dirname(targetPath), newName);
}
