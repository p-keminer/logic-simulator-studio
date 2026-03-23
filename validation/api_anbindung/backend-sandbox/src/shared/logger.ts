import type { Writable } from 'node:stream';
import type { SandboxConfig } from './config.js';

export interface LoggerContext {
  requestId?: string;
  module?: string;
}

export const createLoggerOptions = (
  config?: Pick<SandboxConfig, 'logLevel'>,
  stream?: Writable,
) => ({
  level: config?.logLevel ?? 'info',
  ...(stream ? { stream } : {}),
});

export const createLoggerContext = (
  requestId: string,
  module?: string,
): LoggerContext => ({
  requestId,
  module,
});
