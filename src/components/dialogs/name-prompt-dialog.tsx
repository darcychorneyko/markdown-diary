import { useState } from 'react';

export function NamePromptDialog({
  title,
  initialValue,
  confirmLabel,
  onConfirm,
  onCancel
}: {
  title: string;
  initialValue: string;
  confirmLabel: string;
  onConfirm(value: string): void;
  onCancel(): void;
}) {
  const [value, setValue] = useState(initialValue);
  const trimmedValue = value.trim();

  return (
    <div className="name-prompt-dialog" role="dialog" aria-label={title}>
      <label>
        Name
        <input aria-label="Name" value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <div className="name-prompt-actions">
        <button onClick={() => onConfirm(trimmedValue)} disabled={trimmedValue.length === 0}>
          {confirmLabel}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
