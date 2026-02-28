/**
 * Central HDL identifier sanitizing utility.
 *
 * Produces IEEE 1364-2001 (Verilog) and IEEE 1076-2002 (VHDL) compliant identifiers.
 * This is the single source of truth for all identifier sanitizing in the HDL exporter.
 *
 * Rules applied to every identifier (in order):
 *   1. Replace chars outside [A-Za-z0-9_] with '_'
 *   2. Strip leading underscores (VHDL/Verilog disallow identifiers starting with '_')
 *   3. Empty result → deterministic fallback 'x'
 *   4. Leading digit → prefix (module: 'm_', signal/port: 'n_')
 *   5. Reserved keyword collision → prefix with 'n_'
 *
 * Verilog keyword check is case-sensitive (Verilog is case-sensitive).
 * VHDL keyword check is case-insensitive (VHDL is case-insensitive).
 */

// ── Verilog-2001 reserved keywords (IEEE 1364-2001) ──────────────────────────
// Complete list as defined in Section 2.1 of IEEE Std 1364-2001.
const VERILOG_KEYWORDS: ReadonlySet<string> = new Set([
  'always', 'and', 'assign', 'automatic',
  'begin', 'buf', 'bufif0', 'bufif1',
  'case', 'casex', 'casez', 'cell', 'cmos', 'config',
  'deassign', 'default', 'defparam', 'design', 'disable',
  'edge', 'else', 'end', 'endcase', 'endconfig', 'endfunction',
  'endgenerate', 'endmodule', 'endprimitive', 'endspecify', 'endtable', 'endtask',
  'event',
  'for', 'force', 'forever', 'fork', 'function',
  'generate', 'genvar',
  'highz0', 'highz1',
  'if', 'ifnone', 'incdir', 'include', 'initial', 'inout', 'input', 'instance', 'integer',
  'join',
  'large', 'liblist', 'library', 'localparam',
  'macromodule', 'medium', 'module',
  'nand', 'negedge', 'nmos', 'nor', 'noshowcancelled', 'not', 'notif0', 'notif1',
  'or', 'output',
  'parameter', 'pmos', 'posedge', 'primitive', 'pull0', 'pull1', 'pulldown', 'pullup',
  'pulsestyle_onevent', 'pulsestyle_ondetect',
  'rcmos', 'real', 'realtime', 'reg', 'release', 'repeat', 'rnmos', 'rpmos',
  'rtran', 'rtranif0', 'rtranif1',
  'scalared', 'showcancelled', 'signed', 'small', 'specify', 'specparam',
  'strong0', 'strong1', 'supply0', 'supply1',
  'table', 'task', 'time', 'tran', 'tranif0', 'tranif1',
  'tri', 'tri0', 'tri1', 'triand', 'trior', 'trireg',
  'unsigned', 'use',
  'vectored',
  'wait', 'wand', 'weak0', 'weak1', 'while', 'wire', 'wor',
  'xnor', 'xor',
]);

// ── VHDL-2002 reserved words (IEEE 1076-2002) ────────────────────────────────
// Complete list from Section 13.9 of IEEE Std 1076-2002.
// Stored lowercase; comparisons use s.toLowerCase() (VHDL is case-insensitive).
const VHDL_KEYWORDS: ReadonlySet<string> = new Set([
  'abs', 'access', 'after', 'alias', 'all', 'and', 'architecture', 'array',
  'assert', 'attribute',
  'begin', 'block', 'body', 'buffer', 'bus',
  'case', 'component', 'configuration', 'constant',
  'disconnect', 'downto',
  'else', 'elsif', 'end', 'entity', 'exit',
  'file', 'for', 'function',
  'generate', 'generic', 'group', 'guarded',
  'if', 'impure', 'in', 'inertial', 'inout', 'is',
  'label', 'library', 'linkage', 'literal', 'loop',
  'map', 'mod',
  'nand', 'new', 'next', 'nor', 'not', 'null',
  'of', 'on', 'open', 'or', 'others', 'out',
  'package', 'port', 'postponed', 'procedure', 'process', 'protected', 'pure',
  'range', 'record', 'register', 'reject', 'rem', 'report', 'return', 'rol', 'ror',
  'select', 'severity', 'signal', 'shared', 'sla', 'sll', 'sra', 'srl', 'subtype',
  'then', 'to', 'transport', 'type',
  'unaffected', 'units', 'until', 'use',
  'variable',
  'wait', 'when', 'while', 'with',
  'xnor', 'xor',
]);

// ── Core sanitizing logic ─────────────────────────────────────────────────────

/**
 * Apply all sanitizing rules to a raw identifier string.
 *
 * @param raw         - User-supplied raw string
 * @param digitPrefix - Prefix added when identifier starts with a digit
 * @param keywords    - Set of reserved keywords for the target language
 * @param caseFold    - true → keyword check uses s.toLowerCase() (VHDL);
 *                      false → case-sensitive check (Verilog)
 */
function applyRules(
  raw: string,
  digitPrefix: string,
  keywords: ReadonlySet<string>,
  caseFold: boolean,
): string {
  // Rule 1: Replace forbidden characters
  let s = raw.replace(/[^A-Za-z0-9_]/g, '_');

  // Rule 2: Strip leading underscores
  const stripped = s.replace(/^_+/, '');
  // Keep stripped version only if it's non-empty; otherwise keep the underscores
  if (stripped) s = stripped;

  // Rule 3: Empty result → 'x' (deterministic fallback)
  if (!s) return `${digitPrefix}x`;

  // Rule 4: Leading digit → add language-appropriate prefix
  if (/^\d/.test(s)) s = `${digitPrefix}${s}`;

  // Rule 5: Reserved keyword → add 'n_' prefix
  const checkStr = caseFold ? s.toLowerCase() : s;
  if (keywords.has(checkStr)) s = `n_${s}`;

  return s;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Sanitize an identifier for Verilog-2001 (case-sensitive keyword check).
 *
 * @param raw  - Raw user-supplied string (e.g. gate label, circuit name)
 * @param kind - 'module' for module names (digit prefix 'm_'),
 *               'signal' for wires/regs/ports (digit prefix 'n_')
 */
export function sanitizeVerilog(raw: string, kind: 'module' | 'signal' = 'signal'): string {
  return applyRules(raw, kind === 'module' ? 'm_' : 'n_', VERILOG_KEYWORDS, false);
}

/**
 * Sanitize an identifier for VHDL-2002 (case-insensitive keyword check).
 *
 * @param raw  - Raw user-supplied string
 * @param kind - 'entity' for entity names (digit prefix 'm_'),
 *               'signal' for signals/ports (digit prefix 'n_')
 */
export function sanitizeVHDL(raw: string, kind: 'entity' | 'signal' = 'signal'): string {
  return applyRules(raw, kind === 'entity' ? 'm_' : 'n_', VHDL_KEYWORDS, true);
}

/**
 * Guarantees uniqueness of a name within the given set.
 * Appends a deterministic numeric suffix (_2, _3, …) on collision.
 * **Mutates `used`** to include the returned name.
 *
 * Usage pattern:
 *   const used = new Set<string>();
 *   const portName = makeUnique(sanitizeVerilog(label), used);
 */
export function makeUnique(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  for (let n = 2; ; n++) {
    const candidate = `${name}_${n}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
}
