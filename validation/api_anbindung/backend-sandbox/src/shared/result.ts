export type Result<TOk, TError = never> =
  | { ok: true; value: TOk }
  | { ok: false; error: TError };

export const ok = <TOk>(value: TOk): Result<TOk> => ({ ok: true, value });

export const err = <TError>(error: TError): Result<never, TError> => ({
  ok: false,
  error,
});

