import fs from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function formatText(sanitize, value) {
  return sanitize(String(value ?? '')).trim();
}

export function runToolWithStatus(run, sanitize = (value) => String(value ?? '')) {
  try {
    return {
      status: 'pass',
      output: formatText(sanitize, run()),
      error: '',
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      const toolName = error.path ?? error.spawnargs?.[0] ?? 'tool';
      return {
        status: 'unsupported',
        output: '',
        error: formatText(sanitize, `${toolName} not installed`),
      };
    }

    return {
      status: 'fail',
      output: formatText(sanitize, error.stdout ?? ''),
      error: formatText(sanitize, error.stderr ?? error.message ?? error),
    };
  }
}

export function compileVerilogWithSyntax(filePath, sanitize = (value) => String(value ?? '')) {
  return {
    iverilog: runToolWithStatus(
      () => execFileSync('iverilog', ['-g2012', '-t', 'null', filePath], { encoding: 'utf8' }),
      sanitize,
    ),
    verilator: runToolWithStatus(
      () => execFileSync('verilator', ['--lint-only', filePath], { encoding: 'utf8' }),
      sanitize,
    ),
    yosys: runToolWithStatus(
      () => execFileSync('yosys', ['-q', '-p', `read_verilog ${filePath}; proc; opt; stat`], { encoding: 'utf8' }),
      sanitize,
    ),
  };
}

export function compileVhdlWithSyntax(filePath, sanitize = (value) => String(value ?? '')) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lgsim-ghdl-'));
  try {
    return {
      ghdl: runToolWithStatus(
        () => execFileSync('ghdl', ['-a', '--std=08', filePath], { encoding: 'utf8', cwd: tempDir }),
        sanitize,
      ),
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function runVerilogSimulation(
  { designFile, testbenchSource, topModule = 'tb' },
  sanitize = (value) => String(value ?? ''),
) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lgsim-iverilog-'));
  const testbenchFile = path.join(tempDir, `${topModule}.v`);
  const outputFile = path.join(tempDir, `${topModule}.out`);

  try {
    await fs.writeFile(testbenchFile, testbenchSource, 'utf8');
    return runToolWithStatus(() => {
      execFileSync('iverilog', ['-g2012', '-s', topModule, '-o', outputFile, designFile, testbenchFile], {
        encoding: 'utf8',
        cwd: tempDir,
      });
      return execFileSync('vvp', [outputFile], { encoding: 'utf8', cwd: tempDir });
    }, sanitize);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function runVhdlSimulation(
  { designFile, testbenchSource, topEntity = 'tb' },
  sanitize = (value) => String(value ?? ''),
) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lgsim-vhdl-'));
  const testbenchFile = path.join(tempDir, `${topEntity}.vhd`);

  try {
    await fs.writeFile(testbenchFile, testbenchSource, 'utf8');
    return runToolWithStatus(() => {
      execFileSync('ghdl', ['-a', '--std=08', designFile], { encoding: 'utf8', cwd: tempDir });
      execFileSync('ghdl', ['-a', '--std=08', testbenchFile], { encoding: 'utf8', cwd: tempDir });
      execFileSync('ghdl', ['-e', '--std=08', topEntity], { encoding: 'utf8', cwd: tempDir });
      return execFileSync('ghdl', ['-r', '--std=08', topEntity], { encoding: 'utf8', cwd: tempDir });
    }, sanitize);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
