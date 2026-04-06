import type { LinkResolution } from '../types.js';

function basenameWithoutMarkdownExtension(notePath: string) {
  const normalized = notePath.replace(/\\/g, '/');
  const lastSegment = normalized.slice(normalized.lastIndexOf('/') + 1);
  return lastSegment.toLowerCase().endsWith('.md') ? lastSegment.slice(0, -3) : lastSegment;
}

export function resolveWikiLink(label: string, notePaths: string[]): LinkResolution {
  const normalized = label.trim().toLowerCase();
  const matches = notePaths.filter((notePath) => {
    return basenameWithoutMarkdownExtension(notePath).toLowerCase() === normalized;
  });

  if (matches.length === 1) {
    return { kind: 'resolved', path: matches[0] };
  }

  if (matches.length > 1) {
    return { kind: 'ambiguous', label, matches };
  }

  return { kind: 'missing', label };
}
