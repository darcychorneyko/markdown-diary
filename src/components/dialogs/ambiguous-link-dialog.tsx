export function AmbiguousLinkDialog({
  matches,
  onPick
}: {
  matches: string[];
  onPick(path: string): void;
}) {
  return (
    <div role="dialog" aria-label="Ambiguous link">
      {matches.map((match) => (
        <button key={match} onClick={() => onPick(match)}>
          {match}
        </button>
      ))}
    </div>
  );
}
