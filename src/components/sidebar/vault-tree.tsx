import type { VaultNode } from '../../lib/types.js';

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
          <button onClick={() => node.kind === 'note' && onOpenNote(node.path)}>{node.name}</button>
          <button onClick={() => onRenamePath(node.path)}>Rename</button>
          <button onClick={() => onDeletePath(node.path)}>Delete</button>
          {node.kind === 'folder' ? (
            <>
              <button onClick={() => onCreateNote(node.path)}>New Note</button>
              <button onClick={() => onCreateFolder(node.path)}>New Folder</button>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
