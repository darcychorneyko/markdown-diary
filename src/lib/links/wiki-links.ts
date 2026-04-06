const WIKI_LINK_RE = /\[\[([^[\]]+)\]\]/g;

export function extractWikiLinks(markdown: string) {
  return [...markdown.matchAll(WIKI_LINK_RE)].map((match) => match[1].trim());
}
