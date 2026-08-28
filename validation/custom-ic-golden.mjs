import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIRCUITS_DIR = path.join(ROOT, 'validation', 'fixtures', 'golden-corpus');
const MANIFEST_FILE = path.join(ROOT, 'validation', 'golden-custom-ics.json');

let cachedManifest;

async function loadCircuit(slug) {
  const filePath = path.join(CIRCUITS_DIR, `${slug}.lgsc.json`);
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function loadManifest() {
  if (!cachedManifest) {
    cachedManifest = JSON.parse(await fs.readFile(MANIFEST_FILE, 'utf8'));
  }
  return cachedManifest;
}

export async function registerGoldenCustomICsForSlug(slug) {
  const manifest = await loadManifest();
  const registrations = manifest[slug] ?? [];
  if (registrations.length === 0) return;

  const { registerCustomIC } = await import(new URL('../src/core/customIc/registerCustomIC.ts', import.meta.url).href);
  for (const registration of registrations) {
    const subcircuit = await loadCircuit(registration.circuitSlug);
    registerCustomIC(registration.name, subcircuit, registration.portNames);
  }
}

export async function registerGoldenCustomICsForSlugs(slugs) {
  for (const slug of new Set(slugs)) {
    await registerGoldenCustomICsForSlug(slug);
  }
}
