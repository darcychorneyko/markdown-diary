import { describe, expect, it } from 'vitest';
import { extractWikiLinks } from './wiki-links.js';

describe('extractWikiLinks', () => {
  it('extracts wiki link labels from markdown text', () => {
    expect(extractWikiLinks('See [[Daily Note]] and [[Ideas]]')).toEqual(['Daily Note', 'Ideas']);
  });
});
