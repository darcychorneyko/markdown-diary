import { describe, expect, it } from 'vitest';
import { resolveWikiLink } from './link-resolution.js';

describe('resolveWikiLink', () => {
  it('resolves an exact filename match', () => {
    const resolution = resolveWikiLink('Daily Note', [
      'C:/vault/Daily Note.md',
      'C:/vault/Elsewhere.md'
    ]);

    expect(resolution).toEqual({
      kind: 'resolved',
      path: 'C:/vault/Daily Note.md'
    });
  });
});
