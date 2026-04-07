import { expect, test } from '@playwright/test';

test('opens a vault, edits a note, and saves it', async ({ page }) => {
  await page.addInitScript(() => {
    const savedNotes = new Map<string, string>();
    const notes = new Map([
      [
        'C:/vault/welcome.md',
        {
          path: 'C:/vault/welcome.md',
          name: 'welcome.md',
          contents: '# Welcome',
          updatedAtMs: 1
        }
      ]
    ]);

    const vaultApi = {
      getLastVaultPath: async () => 'C:/vault',
      setLastVaultPath: async () => {},
      chooseVault: async () => 'C:/vault',
      readVaultTree: async () => [
        {
          kind: 'note',
          name: 'welcome.md',
          path: 'C:/vault/welcome.md'
        }
      ],
      readNote: async (path: string) => {
        const note = notes.get(path);
        if (!note) {
          throw new Error(`Missing note for ${path}`);
        }

        return note;
      },
      saveNote: async (path: string, contents: string) => {
        savedNotes.set(path, contents);
        notes.set(path, {
          path,
          name: 'welcome.md',
          contents,
          updatedAtMs: 2
        });
      },
      createNote: async () => {
        throw new Error('unused');
      },
      createFolder: async () => {
        throw new Error('unused');
      },
      renamePath: async () => {
        throw new Error('unused');
      },
      deletePath: async () => {
        throw new Error('unused');
      },
      watchVault: async () => {},
      unwatchVault: async () => {},
      onVaultChanged: () => () => {},
      onMenuCommand: () => () => {},
      showExplorerContextMenu: async () => {}
    };

    Object.assign(window, {
      vaultApi,
      __savedNotes: savedNotes
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'welcome' }).evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
  await page.getByRole('textbox').evaluate((element, value) => {
    const textarea = element as HTMLTextAreaElement;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    descriptor?.set?.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  }, '# Welcome\nEdited');
  await expect(page.locator('.preview')).toContainText('Edited');
  await page.getByRole('button', { name: 'Save' }).evaluate((element) => {
    (element as HTMLButtonElement).click();
  });

  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => (window as typeof window & { __savedNotes: Map<string, string> }).__savedNotes.get('C:/vault/welcome.md'))
    )
    .toBe('# Welcome\nEdited');
});
