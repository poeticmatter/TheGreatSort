import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ENGINE_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const IMPORT_SPECIFIER = /from\s+['"]([^'"]+)['"]/g;

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [entryPath] : [];
  });

const listImportSpecifiers = (filePath: string): string[] =>
  Array.from(readFileSync(filePath, 'utf-8').matchAll(IMPORT_SPECIFIER), match => match[1]);

const isInsideEngine = (filePath: string, specifier: string): boolean =>
  specifier.startsWith('.') && join(dirname(filePath), specifier).startsWith(ENGINE_DIRECTORY);

// The engine has to run headless (simulation bots, workers, scripts), so it
// may not depend on React, persistence, presentation config or any package.
describe('engine boundary', () => {
  it('imports nothing from outside the engine folder', () => {
    const outsideImports = listSourceFiles(ENGINE_DIRECTORY).flatMap(filePath =>
      listImportSpecifiers(filePath)
        .filter(specifier => !isInsideEngine(filePath, specifier))
        .map(specifier => `${filePath} -> ${specifier}`)
    );

    expect(outsideImports).toEqual([]);
  });
});
