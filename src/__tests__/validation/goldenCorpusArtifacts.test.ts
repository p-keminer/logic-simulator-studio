// @ts-expect-error Validation-only test; app tsconfig does not include Node lib types.
import { execFileSync } from 'node:child_process';
// @ts-expect-error Validation-only test; app tsconfig does not include Node lib types.
import fs from 'node:fs';
// @ts-expect-error Validation-only test; app tsconfig does not include Node lib types.
import path from 'node:path';
// @ts-expect-error Validation-only test; app tsconfig does not include Node lib types.
import process from 'node:process';
// @ts-expect-error Validation-only test; app tsconfig does not include Node lib types.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type CorpusEntry = {
  slug: string;
  class: string;
};

type CustomIcManifest = Record<string, Array<{
  circuitSlug: string;
}>>;

type FileEntry = {
  name: string;
  isFile(): boolean;
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CIRCUIT_DIR = path.join(ROOT, 'validation', 'fixtures', 'golden-corpus');
const HDL_DIR = path.join(ROOT, 'validation', 'baselines', 'golden-hdl');
const ARTIFACT_DIR = path.join(ROOT, '.artifacts', 'validation', 'golden-corpus');

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8')) as T;
}

function listFiles(directory: string): string[] {
  return (fs.readdirSync(directory, { withFileTypes: true }) as FileEntry[])
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

function snapshotTree(directory: string): Array<[string, string]> {
  if (!fs.existsSync(directory)) return [];
  const result: Array<[string, string]> = [];
  const visit = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        result.push([
          path.relative(directory, absolute).split(path.sep).join('/'),
          fs.readFileSync(absolute).toString('base64'),
        ]);
      }
    }
  };
  visit(directory);
  return result.sort(([left], [right]) => left.localeCompare(right));
}

describe('golden corpus source artifacts', () => {
  it('keeps the manifest, circuit fixtures, custom-IC definitions, and HDL baselines complete', () => {
    const corpus = readJson<{ circuits: CorpusEntry[] }>('validation/golden-corpus-v1.json');
    const customIcs = readJson<CustomIcManifest>('validation/golden-custom-ics.json');
    const corpusSlugs = corpus.circuits.map((entry) => entry.slug);

    expect(corpusSlugs).toHaveLength(30);
    expect(new Set(corpusSlugs).size).toBe(corpusSlugs.length);

    const referencedDefinitionSlugs = Object.values(customIcs)
      .flat()
      .map((definition) => definition.circuitSlug);
    const expectedCircuitSlugs = [...new Set([...corpusSlugs, ...referencedDefinitionSlugs])].sort();
    const actualCircuitSlugs = listFiles(CIRCUIT_DIR)
      .filter((file) => file.endsWith('.lgsc.json'))
      .map((file) => file.slice(0, -'.lgsc.json'.length));

    expect(actualCircuitSlugs).toEqual(expectedCircuitSlugs);

    for (const slug of actualCircuitSlugs) {
      expect(() => JSON.parse(fs.readFileSync(path.join(CIRCUIT_DIR, `${slug}.lgsc.json`), 'utf8'))).not.toThrow();
    }

    const expectedHdlFiles = corpusSlugs
      .flatMap((slug) => [`${slug}.v`, `${slug}.vhd`])
      .sort();
    expect(listFiles(HDL_DIR)).toEqual(expectedHdlFiles);

    for (const file of expectedHdlFiles) {
      expect(fs.readFileSync(path.join(HDL_DIR, file), 'utf8').trim().length).toBeGreaterThan(0);
    }
  });

  it('runs one slug cross-platform without modifying aggregate run artifacts', () => {
    const before = snapshotTree(ARTIFACT_DIR);
    const output = execFileSync(
      process.execPath,
      [
        path.join(ROOT, 'node_modules', 'vite-node', 'dist', 'cli.mjs'),
        'validation/run-golden-corpus-v1.mjs',
        '--slug',
        'gc_c1_basic_gates',
      ],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );

    expect(output).toContain('Artifact writes skipped for partial --slug run');
    expect(snapshotTree(ARTIFACT_DIR)).toEqual(before);
  }, 30000);
});
