export type VaultNode =
  | {
      kind: 'folder';
      name: string;
      path: string;
      children: VaultNode[];
    }
  | {
      kind: 'note';
      name: string;
      path: string;
    };

export type NoteDocument = {
  path: string;
  name: string;
  contents: string;
  updatedAtMs: number;
};

export type VaultChangeEvent = {
  eventName: string;
  path: string;
};

export type MenuCommandEvent =
  | {
      command: 'open-vault';
    }
  | {
      command: 'new-note';
      targetPath: string;
    }
  | {
      command: 'new-folder';
      targetPath: string;
    }
  | {
      command: 'rename-path';
      targetPath: string;
    }
  | {
      command: 'delete-path';
      targetPath: string;
    };

export type ExplorerContextMenuRequest =
  | { kind: 'vault-root'; targetPath: string }
  | { kind: 'folder'; targetPath: string }
  | { kind: 'note'; targetPath: string };

export type LinkResolution =
  | { kind: 'resolved'; path: string }
  | { kind: 'missing'; label: string }
  | { kind: 'ambiguous'; label: string; matches: string[] };
