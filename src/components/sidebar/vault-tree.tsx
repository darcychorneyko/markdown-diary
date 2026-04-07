import type { ExplorerContextMenuRequest, VaultNode } from '../../lib/types.js';

function getNodeLabel(node: VaultNode) {
  if (node.kind === 'note' && node.name.toLowerCase().endsWith('.md')) {
    return node.name.slice(0, -3);
  }

  return node.name;
}

function renderNode(
  node: VaultNode,
  onOpenNote: (path: string) => void,
  onOpenContextMenu: (request: ExplorerContextMenuRequest) => void
) {
  return (
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
      {node.kind === 'folder' && node.children.length > 0 ? (
        <ul>{node.children.map((child) => renderNode(child, onOpenNote, onOpenContextMenu))}</ul>
      ) : null}
    </li>
  );
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
      {nodes.map((node) => renderNode(node, onOpenNote, onOpenContextMenu))}
    </ul>
  );
}
