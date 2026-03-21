export type SandboxErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface SandboxErrorDetails {
  [key: string]: unknown;
}

export interface SandboxErrorShape {
  code: SandboxErrorCode;
  message: string;
  statusCode: number;
  details?: SandboxErrorDetails;
}

export class SandboxError extends Error {
  public readonly code: SandboxErrorCode;
  public readonly statusCode: number;
  public readonly details?: SandboxErrorDetails;

  public constructor(shape: SandboxErrorShape) {
    super(shape.message);
    this.name = 'SandboxError';
    this.code = shape.code;
    this.statusCode = shape.statusCode;
    this.details = shape.details;
  }
}

export const createSandboxError = (
  code: SandboxErrorCode,
  message: string,
  statusCode: number,
  details?: SandboxErrorDetails,
): SandboxError => new SandboxError({ code, message, statusCode, details });

export const isSandboxError = (value: unknown): value is SandboxError =>
  value instanceof SandboxError;

