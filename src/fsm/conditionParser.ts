// ── Expr AST ─────────────────────────────────────────────────────────────────
export type Expr =
  | { kind: 'var';   name: string }
  | { kind: 'const'; value: boolean }
  | { kind: 'not';   operand: Expr }
  | { kind: 'and';   left: Expr; right: Expr }
  | { kind: 'or';    left: Expr; right: Expr };

export interface ParseResult {
  ast: Expr | null;
  error: string | null;
}

// ── Tokenizer ─────────────────────────────────────────────────────────────────
type TokType = 'IDENT'|'AND'|'OR'|'NOT'|'LP'|'RP'|'TRUE'|'FALSE'|'EOF';
interface Tok { type: TokType; value?: string; pos: number }

function tokenize(text: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }
    if (text.slice(i,i+2)==='&&') { toks.push({type:'AND',pos:i}); i+=2; continue; }
    if (text.slice(i,i+2)==='||') { toks.push({type:'OR', pos:i}); i+=2; continue; }
    const c = text[i];
    if (c==='&') { toks.push({type:'AND',pos:i}); i++; continue; }
    if (c==='|') { toks.push({type:'OR', pos:i}); i++; continue; }
    if (c==='!'||c==='~') { toks.push({type:'NOT',pos:i}); i++; continue; }
    if (c==='(') { toks.push({type:'LP', pos:i}); i++; continue; }
    if (c===')') { toks.push({type:'RP', pos:i}); i++; continue; }
    if (c==='1') { toks.push({type:'TRUE',pos:i}); i++; continue; }
    if (c==='0') { toks.push({type:'FALSE',pos:i}); i++; continue; }
    if (/[2-9]/.test(c)) throw new Error(`Ziffer '${c}' an Position ${i} – nur 0 (FALSE) und 1 (TRUE) erlaubt`);
    if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < text.length && /[a-zA-Z_0-9]/.test(text[j])) j++;
      const w = text.slice(i,j), lo = w.toLowerCase();
      if      (lo==='and')   toks.push({type:'AND',  pos:i});
      else if (lo==='or')    toks.push({type:'OR',   pos:i});
      else if (lo==='not')   toks.push({type:'NOT',  pos:i});
      else if (lo==='true')  toks.push({type:'TRUE', pos:i});
      else if (lo==='false') toks.push({type:'FALSE',pos:i});
      else                    toks.push({type:'IDENT',value:w.toUpperCase(),pos:i});
      i=j; continue;
    }
    throw new Error(`Ungültiges Zeichen '${c}' an Position ${i}`);
  }
  toks.push({type:'EOF',pos:text.length});
  return toks;
}

// ── Recursive-Descent Parser ──────────────────────────────────────────────────
class Parser {
  private pos = 0;
  private toks: Tok[];
  constructor(toks: Tok[]) { this.toks = toks; }
  peek(): Tok  { return this.toks[this.pos]; }
  next(): Tok  { return this.toks[this.pos++]; }

  parseExpr(): Expr  { return this.parseOr(); }

  parseOr(): Expr {
    let l = this.parseAnd();
    while (this.peek().type==='OR')  { this.next(); l={kind:'or', left:l,right:this.parseAnd()}; }
    return l;
  }
  parseAnd(): Expr {
    let l = this.parseNot();
    while (this.peek().type==='AND') { this.next(); l={kind:'and',left:l,right:this.parseNot()}; }
    return l;
  }
  parseNot(): Expr {
    if (this.peek().type==='NOT') { this.next(); return {kind:'not',operand:this.parseNot()}; }
    return this.parseAtom();
  }
  parseAtom(): Expr {
    const t = this.peek();
    if (t.type==='IDENT')  { this.next(); return {kind:'var',name:t.value!}; }
    if (t.type==='TRUE')   { this.next(); return {kind:'const',value:true}; }
    if (t.type==='FALSE')  { this.next(); return {kind:'const',value:false}; }
    if (t.type==='LP') {
      this.next();
      const e = this.parseExpr();
      if (this.peek().type!=='RP') throw new Error('Schließende Klammer ) fehlt');
      this.next();
      return e;
    }
    throw new Error(`Unerwartetes Token ${t.type} an Position ${t.pos}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Parse a boolean condition string.  Empty / "1" / "always" → always-true. */
export function parseCondition(text: string): ParseResult {
  const s = text.trim();
  if (!s || s==='1' || s.toLowerCase()==='always') return {ast:{kind:'const',value:true},error:null};
  if (s==='0' || s.toLowerCase()==='never')        return {ast:{kind:'const',value:false},error:null};
  try {
    const toks = tokenize(s);
    const p    = new Parser(toks);
    const ast  = p.parseExpr();
    if (p.peek().type!=='EOF') return {ast:null,error:'Überflüssige Zeichen nach dem Ausdruck'};
    return {ast,error:null};
  } catch(e) { return {ast:null,error:(e as Error).message}; }
}

/** Evaluate a parsed expression given concrete input values. */
export function evalCondition(ast: Expr, vals: Record<string,boolean>): boolean {
  switch(ast.kind) {
    case 'const': return ast.value;
    case 'var':   return vals[ast.name] ?? false;
    case 'not':   return !evalCondition(ast.operand, vals);
    case 'and':   return evalCondition(ast.left,vals) && evalCondition(ast.right,vals);
    case 'or':    return evalCondition(ast.left,vals) || evalCondition(ast.right,vals);
  }
}

/** Return all variable names used in an expression. */
export function exprVars(ast: Expr): string[] {
  const s = new Set<string>();
  function walk(n: Expr) {
    if (n.kind==='var')              s.add(n.name);
    else if (n.kind==='not')         walk(n.operand);
    else if (n.kind==='and'||n.kind==='or') { walk(n.left); walk(n.right); }
  }
  walk(ast); return [...s];
}

/** Return an error string if any variable is not in inputNames, else null. */
export function validateVars(ast: Expr, inputNames: string[]): string | null {
  const unk = exprVars(ast).filter(v => !inputNames.includes(v));
  return unk.length ? `Unbekannte Variable(n): ${unk.join(', ')} – Eingänge: ${inputNames.join(', ')}` : null;
}

/**
 * Return all minterm indices where the condition is true.
 * Bit order: LSB = inputNames[0], MSB = inputNames[n-1].
 * Used by the hardware-synthesis engine (Phase 2).
 */
export function getMinterms(ast: Expr, inputNames: string[]): number[] {
  const n = inputNames.length;
  if (n > 20) throw new Error(`getMinterms: zu viele Inputs (${n}), Maximum 20`);
  const result: number[] = [];
  for (let i = 0; i < (1<<n); i++) {
    const vals: Record<string,boolean> = {};
    for (let j = 0; j < n; j++) vals[inputNames[j]] = ((i>>j)&1)===1;
    if (evalCondition(ast,vals)) result.push(i);
  }
  return result;
}

/** Generate a human-readable label for a condition  (e.g. "A=1, B=0"). */
export function conditionLabel(text: string): string {
  return text.trim() || '1';
}
