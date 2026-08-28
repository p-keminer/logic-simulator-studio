import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CIRCUITS_DIR = path.join(ROOT, 'validation', 'fixtures', 'golden-corpus');
const EXPORTS_DIR = path.join(ROOT, 'validation', 'baselines', 'golden-hdl');
const { registerGoldenCustomICsForSlugs } = await import(new URL('./custom-ic-golden.mjs', import.meta.url).href);

async function main() {
  const slugs = process.argv.slice(2);
  if (slugs.length === 0) {
    console.error('Usage: vite-node validation/regenerate-golden-exports.mjs <slug> [slug...]');
    process.exit(2);
  }

  await import(new URL('../src/core/registry/index.ts', import.meta.url).href);
  await registerGoldenCustomICsForSlugs(slugs);
  const { generateVerilog } = await import(new URL('../src/core/io/verilog.ts', import.meta.url).href);
  const { generateVHDL } = await import(new URL('../src/core/io/vhdl.ts', import.meta.url).href);

  for (const slug of slugs) {
    const circuitPath = path.join(CIRCUITS_DIR, `${slug}.lgsc.json`);
    const circuit = JSON.parse(await fs.readFile(circuitPath, 'utf8'));
    await fs.writeFile(path.join(EXPORTS_DIR, `${slug}.v`), generateVerilog(circuit), 'utf8');
    await fs.writeFile(path.join(EXPORTS_DIR, `${slug}.vhd`), generateVHDL(circuit), 'utf8');
    console.log(`Regenerated golden exports for ${slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
