// @ts-expect-error Validation-only test; app tsconfig does not include Node lib types.
import { execFileSync } from 'node:child_process';
// @ts-expect-error Validation-only test; app tsconfig does not include Node lib types.
import fs from 'node:fs';
// @ts-expect-error Validation-only test; app tsconfig does not include Node lib types.
import path from 'node:path';
// @ts-expect-error Validation-only test; app tsconfig does not include Node lib types.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type CorpusEntry = {
  slug: string;
  class: string;
};

type Summary = {
  runnerVersion: string;
  corpusVersion: string;
  totalCases: number;
  passed: number;
  failed: number;
  expectedLimit: number;
  unsupported: number;
  verdict: string;
  perClass: Record<string, { pass: number; fail: number; expected_limit: number; unsupported: number; total: number }>;
  perCase: Array<{ slug: string; class: string; status: string }>;
};

type Acceptance = {
  runnerVersion: string;
  corpusVersion: string;
  counts: {
    totalCases: number;
    indexEntries: number;
    circuitFiles: number;
    verilogExports: number;
    vhdlExports: number;
    passed: number;
    failed: number;
    expectedLimit: number;
    unsupported: number;
  };
  status: {
    exists: boolean;
    executed: boolean;
    inCi: boolean;
    acceptanceArtifactsSynchronized: boolean;
    partialRunsProtected: boolean;
  };
  coverage: Record<string, string[]>;
  expectedLimitSlugs: string[];
  requirementsAssessment: Record<string, { status: string; note: string }>;
  scopeDecision: {
    status: string;
    note: string;
    remainingOptionalExpansion: string[];
  };
  knownBoundaries: Array<{ slug: string; classification: string }>;
  canonicalDocs: string[];
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function readJson<T>(relativePath: string): T {
  const filePath = path.join(ROOT, relativePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('golden corpus acceptance artifacts', () => {
  it('keeps summary and acceptance aligned with the corpus index', () => {
    const corpus = readJson<{ circuits: CorpusEntry[] }>('validation/golden-corpus-v1.json');
    const summary = readJson<Summary>('validation/golden-corpus-v1-summary.json');
    const acceptance = readJson<Acceptance>('validation/golden-corpus-v1-acceptance.json');

    const entries = corpus.circuits;
    const expectedCoverage = {
      combinational: entries.filter((entry) => entry.class === 'combinational').map((entry) => entry.slug),
      sequential: entries.filter((entry) => entry.class === 'sequential').map((entry) => entry.slug),
      tristate: entries.filter((entry) => entry.class === 'tristate').map((entry) => entry.slug),
      mixed: entries.filter((entry) => entry.class === 'mixed').map((entry) => entry.slug),
    };

    expect(summary.totalCases).toBe(entries.length);
    expect(acceptance.counts.totalCases).toBe(entries.length);
    expect(acceptance.counts.indexEntries).toBe(entries.length);
    expect(acceptance.counts.circuitFiles).toBe(entries.length);
    expect(acceptance.counts.verilogExports).toBe(entries.length);
    expect(acceptance.counts.vhdlExports).toBe(entries.length);
    expect(acceptance.counts.passed).toBe(summary.passed);
    expect(acceptance.counts.failed).toBe(summary.failed);
    expect(acceptance.counts.expectedLimit).toBe(summary.expectedLimit);
    expect(acceptance.counts.unsupported).toBe(summary.unsupported);
    expect(acceptance.runnerVersion).toBe(summary.runnerVersion);
    expect(acceptance.corpusVersion).toBe(summary.corpusVersion);
    expect(acceptance.coverage).toEqual(expectedCoverage);

    for (const [className, slugs] of Object.entries(expectedCoverage)) {
      expect(summary.perClass[className]?.total ?? 0).toBe(slugs.length);
    }

    const expectedLimitSlugs = summary.perCase
      .filter((result) => result.status === 'expected_limit')
      .map((result) => result.slug)
      .sort();

    expect([...acceptance.expectedLimitSlugs].sort()).toEqual(expectedLimitSlugs);
    expect(acceptance.knownBoundaries.map((entry) => entry.slug).sort()).toEqual(expectedLimitSlugs);
    expect(acceptance.knownBoundaries.every((entry) => entry.classification === 'expected_limit')).toBe(true);

    expect(acceptance.status.exists).toBe(true);
    expect(acceptance.status.executed).toBe(true);
    expect(acceptance.status.inCi).toBe(true);
    expect(acceptance.status.acceptanceArtifactsSynchronized).toBe(true);
    expect(acceptance.status.partialRunsProtected).toBe(true);
    expect(acceptance.requirementsAssessment.traceDepthHardening.status).toBe('fulfilled');
    expect(acceptance.requirementsAssessment.largeSystemBreadth.status).toBe('fulfilled_current_scope');
    expect(acceptance.requirementsAssessment.hierarchyDepth.status).toBe('partial_documented_boundary');
    expect(acceptance.requirementsAssessment.busMemoryConflictSystems.status).toBe('fulfilled_current_scope');
    expect(acceptance.requirementsAssessment.gateStability.status).toBe('fulfilled');
    expect(acceptance.scopeDecision.status).toBe('closed_current_scope');
    expect(acceptance.scopeDecision.remainingOptionalExpansion.length).toBeGreaterThan(0);

    for (const docPath of acceptance.canonicalDocs) {
      expect(fs.existsSync(path.join(ROOT, docPath))).toBe(true);
    }
  });

  it('keeps the markdown report synchronized with the generated summary', () => {
    const summary = readJson<Summary>('validation/golden-corpus-v1-summary.json');
    const report = readText('validation/golden-corpus-v1-report.md');

    expect(report).toContain(`| Total cases | ${summary.totalCases} |`);
    expect(report).toContain(`| Passed | ${summary.passed} |`);
    expect(report).toContain(`| Failed | ${summary.failed} |`);
    expect(report).toContain(`| Expected limit | ${summary.expectedLimit} |`);
    expect(report).toContain(`| Unsupported | ${summary.unsupported} |`);
    expect(report).toContain(`**Verdict:** ${summary.verdict}`);

    if (summary.expectedLimit > 0) {
      expect(report).toContain(`${summary.expectedLimit} known limit`);
    }

    for (const [className, counts] of Object.entries(summary.perClass)) {
      const row = `| ${className} | ${counts.pass} | ${counts.fail} | ${counts.expected_limit} | ${counts.unsupported} | ${counts.total} |`;
      expect(report).toContain(row);
    }

    for (const result of summary.perCase.filter((entry) => entry.status === 'expected_limit')) {
      expect(report).toContain(`### ${result.slug} — EXPECTED LIMIT`);
    }
  });

  it('protects canonical artifacts from partial --slug runs', () => {
    const summaryPath = path.join(ROOT, 'validation/golden-corpus-v1-summary.json');
    const reportPath = path.join(ROOT, 'validation/golden-corpus-v1-report.md');
    const acceptancePath = path.join(ROOT, 'validation/golden-corpus-v1-acceptance.json');
    const before = {
      summary: fs.readFileSync(summaryPath, 'utf8'),
      report: fs.readFileSync(reportPath, 'utf8'),
      acceptance: fs.readFileSync(acceptancePath, 'utf8'),
    };

    execFileSync(
      path.join(ROOT, 'node_modules/.bin/vite-node'),
      ['validation/run-golden-corpus-v1.mjs', '--slug', 'gc_c1_basic_gates'],
      { cwd: ROOT, stdio: 'pipe' },
    );

    expect(fs.readFileSync(summaryPath, 'utf8')).toBe(before.summary);
    expect(fs.readFileSync(reportPath, 'utf8')).toBe(before.report);
    expect(fs.readFileSync(acceptancePath, 'utf8')).toBe(before.acceptance);
  }, 30000);
});
