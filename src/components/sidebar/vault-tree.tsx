import { useState } from 'react';
import type { ExplorerContextMenuRequest, VaultNode } from '../../lib/types.js';

function getNodeLabel(node: VaultNode) {
  if (node.kind === 'note' && node.name.toLowerCase().endsWith('.md')) {
    return node.name.slice(0, -3);
  }

  return node.name;
}

function FolderNode({
  node,
  onOpenNote,
  onOpenContextMenu
}: {
  node: Extract<VaultNode, { kind: 'folder' }>;
  onOpenNote: (path: string) => void;
  onOpenContextMenu: (request: ExplorerContextMenuRequest) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <li className="tree-node" key={node.path}>
      <div className="tree-row">
        <button
          type="button"
          className="tree-disclosure"
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} folder ${node.name}`}
          onClick={() => {
            setIsExpanded((currentValue) => !currentValue);
          }}
        >
          <span aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
        </button>
        <button
          type="button"
          className="tree-item-button"
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
      </div>
      {isExpanded && node.children.length > 0 ? (
        <ul className="tree-children">
          {node.children.map((child) => renderNode(child, onOpenNote, onOpenContextMenu))}
        </ul>
      ) : null}
    </li>
  );
}

function renderNode(
  node: VaultNode,
  onOpenNote: (path: string) => void,
  onOpenContextMenu: (request: ExplorerContextMenuRequest) => void
) {
  if (node.kind === 'folder') {
    return (
      <FolderNode
        key={node.path}
        node={node}
        onOpenNote={onOpenNote}
        onOpenContextMenu={onOpenContextMenu}
      />
    );
  }

  return (
    <li className="tree-node" key={node.path}>
      <button
        type="button"
        className="tree-item-button"
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
