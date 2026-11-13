import fs from 'node:fs/promises';
import path from 'node:path';

export async function importFile(page, { name, buffer }) {
  const directory = await fs.mkdtemp(path.join(import.meta.dirname, '../test-results/import-'));
  const file = path.join(directory, path.basename(name));
  await fs.writeFile(file, buffer);
  try { await page.locator('input.file').setInputFiles(file); }
  finally { await fs.rm(directory, { recursive: true }); }
}
