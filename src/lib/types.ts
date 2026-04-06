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

export type LinkResolution =
  | { kind: 'resolved'; path: string }
  | { kind: 'missing'; label: string }
  | { kind: 'ambiguous'; label: string; matches: string[] };
