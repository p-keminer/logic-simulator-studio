import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const repoRoot = path.resolve(scriptDir, '..');
const outputDir = path.join(repoRoot, 'ROADMAP_COMPL');

const EXCLUDED_DIRECTORY_NAMES = new Set([
  '.git',
  'ROADMAP_COMPL',
  'dist',
  'node_modules',
]);

const SUPPORTING_PATH_PREFIXES = [
  '.claude/',
  'validation/api_anbindung/',
  'validation/archive/pre-p0/',
  'validation/fsm0/',
  'validation/race-panel-fixes/',
];

const STATUS_LABELS = ['Status', 'Stand', 'Qualitaetsstand'];
const CATEGORY_DIRECTORY_NAMES = {
  api: 'API',
  fsm: 'FSM',
};
const EXPLICIT_FSM_PATHS = new Set([
  'validation/fsm0/work-package.md',
  'validation/ui-manual-verification-plan.md',
]);

function toPosixRelativePath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function isExtensionlessRoadmap(relativePath) {
  return path.posix.basename(relativePath) === 'ROADMAP' && path.posix.extname(relativePath) === '';
}

function isHumanReadableDoc(relativePath) {
  return path.posix.extname(relativePath).toLowerCase() === '.md' || isExtensionlessRoadmap(relativePath);
}

function isSupportingDocument(relativePath) {
  return SUPPORTING_PATH_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function isSeedDocument(relativePath) {
  const name = path.posix.basename(relativePath).toLowerCase();
  return name === 'readme.md'
    || name === 'roadmap'
    || name.includes('roadmap')
    || name.includes('plan')
    || name.includes('verification')
    || name.includes('work-package')
    || name.includes('backlog');
}

function isRootOrValidationTopLevel(relativePath) {
  const segments = relativePath.split('/');
  return segments.length === 1 || (segments.length === 2 && segments[0] === 'validation');
}

function shouldIncludeDocument(relativePath) {
  if (!isHumanReadableDoc(relativePath)) return false;
  if (isSupportingDocument(relativePath)) return true;
  return isRootOrValidationTopLevel(relativePath) && isSeedDocument(relativePath);
}

function classifyDocument(relativePath) {
  const name = path.posix.basename(relativePath).toLowerCase();

  if (name === 'readme.md') return 'readme';
  if (name.includes('work-package')) return 'work-package';
  if (name === 'roadmap' || name.includes('roadmap')) return 'roadmap';
  if (name.includes('verification')) return 'verification';
  if (name.includes('plan') || name.includes('backlog')) return 'plan';
  return 'supporting';
}

function buildCopyFileName(relativePath) {
  const flattened = relativePath.replaceAll('/', '__');
  const extension = path.posix.extname(flattened);
  if (!extension) return `${flattened}_COPY`;

  const stem = flattened.slice(0, -extension.length);
  return `${stem}_COPY${extension}`;
}

function resolveCategory(relativePath, fileContent) {
  if (relativePath.startsWith('validation/api_anbindung/')) return 'api';
  if (EXPLICIT_FSM_PATHS.has(relativePath)) return 'fsm';

  const normalizedPath = relativePath.toLowerCase();
  if (normalizedPath.includes('/fsm-') || normalizedPath.includes('/fsm0/')) return 'fsm';

  const normalizedContent = fileContent.toLowerCase();
  const titleAndPurpose = normalizedContent
    .split(/\r?\n/)
    .slice(0, 20)
    .join('\n');
  const apiKeywordMatches = [
    'api-anbindung',
    'api_anbindung',
    'backend broker',
    'backend-broker',
    'provider',
    'session',
    'auth',
    'secret',
    'frontend-backend',
  ].filter((keyword) => titleAndPurpose.includes(keyword)).length;
  if (apiKeywordMatches >= 2) return 'api';

  return 'root';
}

function normalizeStatusLine(line) {
  return line.replaceAll('*', '').replaceAll('`', '').trim();
}

function extractStatusHint(fileContent) {
  const lines = fileContent.split(/\r?\n/);

  for (const label of STATUS_LABELS) {
    for (const line of lines) {
      const normalized = normalizeStatusLine(line);
      const match = normalized.match(new RegExp(`^${label}\\s*:\\s*(.+)$`));
      if (match) return match[1].trim() || '-';
    }
  }

  return '-';
}

function escapeTableCell(value) {
  return value.replaceAll('|', '\\|');
}

async function collectDocuments(directoryPath, documents) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    const relativePath = toPosixRelativePath(absolutePath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORY_NAMES.has(entry.name)) continue;
      await collectDocuments(absolutePath, documents);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!shouldIncludeDocument(relativePath)) continue;

    documents.push(relativePath);
  }
}

function buildIndexContent(entries) {
  const lines = [
    '# ROADMAP_COMPL Index',
    '',
    'Dieser Ordner enthaelt pfadcodierte Kopien der repo-eigenen Ablauf- und Fortschrittsdokumente.',
    '',
    '- `API/`: inhaltlich hauptsaechlich API-/Broker-/Backend-Anbindung',
    '- `FSM/`: inhaltlich hauptsaechlich FSM-/STT-/Timing-/Synthese-Strang',
    '- Root: verbleibende allgemeine Ablauf- und Verifikationsdokumente',
    '',
    `Dokumente: ${entries.length}`,
    '',
    '| Originalpfad | Zielpfad | Kategorie | Dokumentklasse | Status-Hinweis |',
    '|---|---|---|---|---|',
  ];

  for (const entry of entries) {
    lines.push(
      `| \`${escapeTableCell(entry.source)}\` | \`${escapeTableCell(entry.outputRelativePath)}\` | ${escapeTableCell(entry.category)} | ${escapeTableCell(entry.documentClass)} | ${escapeTableCell(entry.statusHint)} |`,
    );
  }

  lines.push('');
  return `${lines.join('\n')}`;
}

async function main() {
  const relativePaths = [];
  await collectDocuments(repoRoot, relativePaths);
  relativePaths.sort((a, b) => a.localeCompare(b));

  const seenCopyNames = new Map();
  const generatedEntries = [];

  for (const relativePath of relativePaths) {
    const content = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
    const category = resolveCategory(relativePath, content);
    const copyName = buildCopyFileName(relativePath);
    const outputRelativePath = category === 'root'
      ? copyName
      : path.posix.join(CATEGORY_DIRECTORY_NAMES[category], copyName);
    const existingSource = seenCopyNames.get(outputRelativePath);
    if (existingSource) {
      throw new Error(
        `Kollision fuer ${outputRelativePath}: ${existingSource} und ${relativePath}`,
      );
    }
    seenCopyNames.set(outputRelativePath, relativePath);

    generatedEntries.push({
      source: relativePath,
      copyName,
      outputRelativePath,
      category,
      documentClass: classifyDocument(relativePath),
      statusHint: extractStatusHint(content),
      content,
    });
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  for (const entry of generatedEntries) {
    const absoluteOutputPath = path.join(outputDir, ...entry.outputRelativePath.split('/'));
    await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
    await fs.writeFile(absoluteOutputPath, entry.content, 'utf8');
  }

  const indexContent = buildIndexContent(generatedEntries);
  await fs.writeFile(path.join(outputDir, 'INDEX_COPY.md'), indexContent, 'utf8');

  console.log(`ROADMAP_COMPL erzeugt: ${generatedEntries.length} Dokumente`);
}

await main();
