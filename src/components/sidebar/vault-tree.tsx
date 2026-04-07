import type { ExplorerContextMenuRequest, VaultNode } from '../../lib/types.js';

function getNodeLabel(node: VaultNode) {
  if (node.kind === 'note' && node.name.toLowerCase().endsWith('.md')) {
    return node.name.slice(0, -3);
  }

  return node.name;
}

export function VaultTree({
  nodes,
  onOpenNote,
  onOpenContextMenu
}: {
  nodes: VaultNode[];
  onOpenNote(path: string): void;
  onOpenContextMenu(request: ExplorerContextMenuRequest): void;
}) {
  return (
    <ul className="tree-root">
      {nodes.map((node) => (
        <li key={node.path}>
          <button
            onClick={() => node.kind === 'note' && onOpenNote(node.path)}
            onContextMenu={(event) => {
              event.preventDefault();
              onOpenContextMenu({
                kind: node.kind,
                targetPath: node.path
              });
            }}
          >
            {getNodeLabel(node)}
          </button>
        </li>
      ))}
    </ul>
  );
}
