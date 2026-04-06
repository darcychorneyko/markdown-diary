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
      onVaultChanged: () => () => {}
    };

    Object.assign(window, {
      vaultApi,
      __savedNotes: savedNotes
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Open Vault' }).click();
  await page.getByRole('button', { name: 'welcome.md' }).click();
  await page.getByRole('textbox').fill('# Welcome\nEdited');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  await expect(page.getByText('Edited')).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => (window as typeof window & { __savedNotes: Map<string, string> }).__savedNotes.get('C:/vault/welcome.md'))
    )
    .toBe('# Welcome\nEdited');
});
