import { readFile, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appBridgeSnapshotSchema,
  type AppBridgeSnapshot,
} from '../../contracts/app-bridge.js';
import { createSandboxError } from '../../shared/errors.js';
import {
  type CurrentCircuitSnapshotProvider,
  type CurrentCircuitSnapshotProviderDescription,
} from './current-circuit-snapshot-provider.js';

export interface FileCurrentCircuitSnapshotProviderOptions {
  readonly providerId?: string;
  readonly snapshotPath: string;
}

const resolveSandboxRootDir = (startDirectory: string) => {
  let currentDirectory = startDirectory;

  while (basename(currentDirectory) !== 'backend-sandbox') {
    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return startDirectory;
    }

    currentDirectory = parentDirectory;
  }

  return currentDirectory;
};

const sandboxRootDir = resolveSandboxRootDir(
  dirname(fileURLToPath(import.meta.url)),
);

const isInsideSandbox = (sandboxRootPath: string, resolvedPath: string) => {
  const relativePath = relative(sandboxRootPath, resolvedPath);

  return (
    relativePath === '' ||
    (!relativePath.startsWith('..') && !isAbsolute(relativePath))
  );
};

const toValidationIssues = (issues: {
  readonly path: PropertyKey[];
  readonly message: string;
}[]) =>
  issues.map((issue) => ({
    field: issue.path.join('.') || 'snapshot',
    reason: issue.message,
  }));

export class FileCurrentCircuitSnapshotProvider
  implements CurrentCircuitSnapshotProvider
{
  private readonly providerId: string;
  private readonly snapshotPath: string;

  constructor(options: FileCurrentCircuitSnapshotProviderOptions) {
    const trimmedSnapshotPath = options.snapshotPath.trim();

    if (trimmedSnapshotPath.length === 0) {
      throw createSandboxError(
        'CONFLICT',
        'Current-circuit snapshot path must be configured inside the sandbox.',
        409,
      );
    }

    const resolvedSnapshotPath = isAbsolute(trimmedSnapshotPath)
      ? resolve(trimmedSnapshotPath)
      : resolve(sandboxRootDir, trimmedSnapshotPath);

    if (!isInsideSandbox(sandboxRootDir, resolvedSnapshotPath)) {
      throw createSandboxError(
        'CONFLICT',
        'Current-circuit snapshot path must stay inside the sandbox.',
        409,
      );
    }

    this.providerId =
      options.providerId ?? 'file-current-circuit-snapshot-provider';
    this.snapshotPath = resolvedSnapshotPath;
  }

  describe(): CurrentCircuitSnapshotProviderDescription {
    return {
      providerId: this.providerId,
      providerMode: 'adapter',
      bridgeVersion: 'sandbox-app-bridge-v1',
      supportsCurrentCircuit: true,
    };
  }

  async getCurrentCircuit(): Promise<AppBridgeSnapshot | null> {
    const resolvedSandboxRootDir = await realpath(sandboxRootDir);
    let resolvedSnapshotPath: string;

    try {
      resolvedSnapshotPath = await realpath(this.snapshotPath);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return null;
      }

      throw createSandboxError(
        'INTERNAL_ERROR',
        'Current-circuit snapshot file could not be resolved in the sandbox.',
        500,
      );
    }

    if (!isInsideSandbox(resolvedSandboxRootDir, resolvedSnapshotPath)) {
      throw createSandboxError(
        'CONFLICT',
        'Resolved current-circuit snapshot path must stay inside the sandbox.',
        409,
      );
    }

    let rawSnapshot: string;

    try {
      rawSnapshot = await readFile(resolvedSnapshotPath, 'utf8');
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return null;
      }

      throw createSandboxError(
        'INTERNAL_ERROR',
        'Current-circuit snapshot file could not be read in the sandbox.',
        500,
      );
    }

    let parsedSnapshot: unknown;

    try {
      parsedSnapshot = JSON.parse(rawSnapshot);
    } catch {
      throw createSandboxError(
        'INTERNAL_ERROR',
        'Current-circuit snapshot file contains invalid JSON in the sandbox.',
        500,
      );
    }

    const validatedSnapshot = appBridgeSnapshotSchema.safeParse(parsedSnapshot);

    if (!validatedSnapshot.success) {
      throw createSandboxError(
        'INTERNAL_ERROR',
        'Current-circuit snapshot file does not match the sandbox bridge contract.',
        500,
        {
          issues: toValidationIssues(validatedSnapshot.error.issues),
        },
      );
    }

    return validatedSnapshot.data;
  }
}
