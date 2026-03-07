/**
 * JK-FF and SR-FF HDL simplification when inputs are driven by constants.
 * Eliminates dead if-branches (e.g. `if (1 && !1)`) for readability.
 */

type ConstVal = 0 | 1 | null;

/** Resolve the constant value for a port, or null if not constant. */
export function portConst(
  gateId: string,
  portId: string,
  constMap?: Record<string, 0 | 1>,
): ConstVal {
  if (!constMap) return null;
  const v = constMap[`${gateId}:${portId}`];
  return v === 0 || v === 1 ? v : null;
}

// ── Verilog ──────────────────────────────────────────────────────────────────

export function jkSimplifiedVerilog(
  j: string, k: string,
  jc: ConstVal, kc: ConstVal,
  q: string, indent: string,
): string[] {
  // Both constant
  if (jc !== null && kc !== null) {
    if (jc === 0 && kc === 0) return [`${indent}// J=0, K=0: hold`];
    if (jc === 0 && kc === 1) return [`${indent}${q} <= 1'b0;`];
    if (jc === 1 && kc === 0) return [`${indent}${q} <= 1'b1;`];
    /* jc === 1 && kc === 1 */ return [`${indent}${q} <= ~${q};`];
  }
  // Only J constant
  if (jc !== null) {
    if (jc === 0) return [
      `${indent}if (${k}) ${q} <= 1'b0;`,
    ];
    /* jc === 1 */ return [
      `${indent}if (!${k}) ${q} <= 1'b1;`,
      `${indent}else       ${q} <= ~${q};`,
    ];
  }
  // Only K constant
  if (kc !== null) {
    if (kc === 0) return [
      `${indent}if (${j}) ${q} <= 1'b1;`,
    ];
    /* kc === 1 */ return [
      `${indent}if (${j})  ${q} <= ~${q};`,
      `${indent}else       ${q} <= 1'b0;`,
    ];
  }
  // Neither constant — full 3-branch
  return [
    `${indent}if      (${j} && !${k}) ${q} <= 1'b1;`,
    `${indent}else if (!${j} && ${k}) ${q} <= 1'b0;`,
    `${indent}else if (${j} && ${k})  ${q} <= ~${q};`,
  ];
}

// ── VHDL ─────────────────────────────────────────────────────────────────────

export function jkSimplifiedVHDL(
  j: string, k: string,
  jc: ConstVal, kc: ConstVal,
  q: string, indent: string,
): string[] {
  // Both constant
  if (jc !== null && kc !== null) {
    if (jc === 0 && kc === 0) return [`${indent}-- J=0, K=0: hold`];
    if (jc === 0 && kc === 1) return [`${indent}${q} <= '0';`];
    if (jc === 1 && kc === 0) return [`${indent}${q} <= '1';`];
    /* jc === 1 && kc === 1 */ return [`${indent}${q} <= not ${q};`];
  }
  // Only J constant
  if (jc !== null) {
    if (jc === 0) return [
      `${indent}if ${k} = '1' then ${q} <= '0';`,
      `${indent}end if;`,
    ];
    /* jc === 1 */ return [
      `${indent}if    ${k} = '0' then ${q} <= '1';`,
      `${indent}elsif ${k} = '1' then ${q} <= not ${q};`,
      `${indent}end if;`,
    ];
  }
  // Only K constant
  if (kc !== null) {
    if (kc === 0) return [
      `${indent}if ${j} = '1' then ${q} <= '1';`,
      `${indent}end if;`,
    ];
    /* kc === 1 */ return [
      `${indent}if    ${j} = '1' then ${q} <= not ${q};`,
      `${indent}elsif ${j} = '0' then ${q} <= '0';`,
      `${indent}end if;`,
    ];
  }
  // Neither constant — full 3-branch
  return [
    `${indent}if    ${j} = '1' and ${k} = '0' then ${q} <= '1';`,
    `${indent}elsif ${j} = '0' and ${k} = '1' then ${q} <= '0';`,
    `${indent}elsif ${j} = '1' and ${k} = '1' then ${q} <= not ${q};`,
    `${indent}end if;`,
  ];
}

// ── SR-FF Edge simplification ────────────────────────────────────────────────
// SR semantics: S=1,R=0 → set; S=0,R=1 → reset; S=1,R=1 → forbidden (Q=0); S=0,R=0 → hold

export function srSimplifiedVerilog(
  s: string, r: string,
  sc: ConstVal, rc: ConstVal,
  q: string, indent: string,
): string[] {
  if (sc !== null && rc !== null) {
    if (sc === 0 && rc === 0) return [`${indent}// S=0, R=0: hold`];
    if (sc === 0 && rc === 1) return [`${indent}${q} <= 1'b0;`];
    if (sc === 1 && rc === 0) return [`${indent}${q} <= 1'b1;`];
    /* sc === 1 && rc === 1 */ return [`${indent}${q} <= 1'b0; // forbidden → 0`];
  }
  if (sc !== null) {
    if (sc === 0) return [
      `${indent}if (${r}) ${q} <= 1'b0;`,
    ];
    /* sc === 1 */ return [
      `${indent}if      (!${r}) ${q} <= 1'b1;`,
      `${indent}else            ${q} <= 1'b0; // forbidden → 0`,
    ];
  }
  if (rc !== null) {
    if (rc === 0) return [
      `${indent}if (${s}) ${q} <= 1'b1;`,
    ];
    /* rc === 1 */ return [
      `${indent}if (${s}) ${q} <= 1'b0; // forbidden → 0`,
      `${indent}else      ${q} <= 1'b0;`,
    ];
  }
  return [
    `${indent}if      (${s} && !${r})  ${q} <= 1'b1;`,
    `${indent}else if (!${s} && ${r})  ${q} <= 1'b0;`,
    `${indent}else if (${s} && ${r})   ${q} <= 1'b0; // forbidden → 0`,
  ];
}

export function srSimplifiedVHDL(
  s: string, r: string,
  sc: ConstVal, rc: ConstVal,
  q: string, indent: string,
): string[] {
  if (sc !== null && rc !== null) {
    if (sc === 0 && rc === 0) return [`${indent}-- S=0, R=0: hold`];
    if (sc === 0 && rc === 1) return [`${indent}${q} <= '0';`];
    if (sc === 1 && rc === 0) return [`${indent}${q} <= '1';`];
    /* sc === 1 && rc === 1 */ return [`${indent}${q} <= '0'; -- forbidden`];
  }
  if (sc !== null) {
    if (sc === 0) return [
      `${indent}if ${r} = '1' then ${q} <= '0';`,
      `${indent}end if;`,
    ];
    /* sc === 1 */ return [
      `${indent}if    ${r} = '0' then ${q} <= '1';`,
      `${indent}elsif ${r} = '1' then ${q} <= '0'; -- forbidden`,
      `${indent}end if;`,
    ];
  }
  if (rc !== null) {
    if (rc === 0) return [
      `${indent}if ${s} = '1' then ${q} <= '1';`,
      `${indent}end if;`,
    ];
    /* rc === 1 */ return [
      `${indent}if    ${s} = '1' then ${q} <= '0'; -- forbidden`,
      `${indent}elsif ${s} = '0' then ${q} <= '0';`,
      `${indent}end if;`,
    ];
  }
  return [
    `${indent}if    ${s} = '1' and ${r} = '0' then ${q} <= '1';`,
    `${indent}elsif ${s} = '0' and ${r} = '1' then ${q} <= '0';`,
    `${indent}elsif ${s} = '1' and ${r} = '1' then ${q} <= '0'; -- forbidden`,
    `${indent}end if;`,
  ];
}

// ── Async S/R wrapper simplification ─────────────────────────────────────────
// Wraps a clock-edge body with optional async set/reset priority branches.
// When S or R is constant LOW, the corresponding branch and sensitivity entry are omitted.

export function asyncSRWrapVerilog(
  clk: string, s: string, r: string,
  sc: ConstVal, rc: ConstVal,
  q: string, bodyLines: string[],
): string[] {
  const sensEntries = [`posedge ${clk}`];
  if (rc !== 0) sensEntries.push(`posedge ${r}`);
  if (sc !== 0) sensEntries.push(`posedge ${s}`);

  const lines: string[] = [`always @(${sensEntries.join(' or ')}) begin`];

  if (rc === 1) {
    // R is always active → permanent reset, no other branches matter
    lines.push(`  ${q} <= 1'b0; // R=const 1`);
  } else if (sc === 1 && rc === 0) {
    // S is always active, R is never active → permanent set
    lines.push(`  ${q} <= 1'b1; // S=const 1`);
  } else {
    // Emit R branch if R is not constant LOW
    if (rc !== 0) {
      lines.push(`  if      (${r})  ${q} <= 1'b0;`);
    }
    // Emit S branch if S is not constant LOW
    if (sc !== 0) {
      const prefix = rc !== 0 ? '  else if' : '  if     ';
      lines.push(`${prefix} (${s})  ${q} <= 1'b1;`);
    }
    // Clock-edge body
    const elsePrefix = (rc !== 0 || sc !== 0) ? '  else begin' : null;
    if (elsePrefix) lines.push(elsePrefix);
    const bodyIndent = (rc !== 0 || sc !== 0) ? '  ' : '';
    for (const bl of bodyLines) lines.push(bodyIndent + bl);
    if (elsePrefix) lines.push('  end');
  }
  return lines;
}

export function asyncSRWrapVHDL(
  clk: string, s: string, r: string,
  sc: ConstVal, rc: ConstVal,
  q: string, bodyLines: string[],
): string[] {
  const sensEntries = [clk];
  if (rc !== 0) sensEntries.push(r);
  if (sc !== 0) sensEntries.push(s);

  const lines: string[] = [
    `process(${sensEntries.join(', ')})`,
    `begin`,
  ];

  if (rc === 1) {
    lines.push(`  ${q} <= '0'; -- R=const 1`);
  } else if (sc === 1 && rc === 0) {
    lines.push(`  ${q} <= '1'; -- S=const 1`);
  } else {
    if (rc !== 0) {
      lines.push(`  if    ${r} = '1'           then ${q} <= '0';`);
    }
    if (sc !== 0) {
      const prefix = rc !== 0 ? '  elsif' : '  if   ';
      lines.push(`${prefix} ${s} = '1'           then ${q} <= '1';`);
    }
    const elsePrefix = (rc !== 0 || sc !== 0)
      ? `  elsif rising_edge(${clk}) then`
      : `  if rising_edge(${clk}) then`;
    lines.push(elsePrefix);
    for (const bl of bodyLines) lines.push('  ' + bl);
    lines.push('  end if;');
  }
  return lines;
}
