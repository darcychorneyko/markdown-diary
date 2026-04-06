import type { VaultNode } from '../../lib/types.js';

function getNodeLabel(node: VaultNode) {
  if (node.kind === 'note' && node.name.toLowerCase().endsWith('.md')) {
    return node.name.slice(0, -3);
  }

  return node.name;
}

export function VaultTree({
  nodes,
  onOpenNote,
  onCreateNote,
  onCreateFolder,
  onRenamePath,
  onDeletePath
}: {
  nodes: VaultNode[];
  onOpenNote(path: string): void;
  onCreateNote(parentPath: string): void;
  onCreateFolder(parentPath: string): void;
  onRenamePath(targetPath: string): void;
  onDeletePath(targetPath: string): void;
}) {
  return (
    <ul className="tree-root">
      {nodes.map((node) => (
        <li key={node.path}>
          <button onClick={() => node.kind === 'note' && onOpenNote(node.path)}>{getNodeLabel(node)}</button>
        </li>
      ))}
    </ul>
  );
}
