/**
 * Dice rolling engine.
 *
 * Supports arbitrary expressions:
 *   "4d4 + 2 + 2d10 - 1d6 + 13d1 + 1 + 1 + 20"
 *
 * Designed to be used by the chat roller, the actions system, and any other
 * future feature that needs to roll dice.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface DiceTerm {
  /** 1 for constants. */
  count: number;
  /** Number of sides. Use 1 to represent a flat constant. */
  sides: number;
  /** The sign preceding this term (+1 or -1). */
  sign: 1 | -1;
}

export interface DiceRoll {
  term: DiceTerm;
  /** Individual die results. For a constant d1 term this is just [value]. */
  rolls: number[];
  /** sign * sum(rolls) — already accounts for the sign. */
  subtotal: number;
}

export interface RollResult {
  /** The original or normalised expression string. */
  expression: string;
  /** One entry per term in the expression. */
  breakdown: DiceRoll[];
  /** Sum of all subtotals. */
  total: number;
}

// ── Parser ─────────────────────────────────────────────────────────────────

/**
 * Parse a dice expression string into an ordered list of DiceTerms.
 *
 * Accepts:
 *   "4d6"           → [{ count:4, sides:6, sign:+1 }]
 *   "2d10 - 1d6"    → [{ count:2, sides:10, sign:+1 }, { count:1, sides:6, sign:-1 }]
 *   "1d8 + 5"       → [{ count:1, sides:8, sign:+1 }, { count:5, sides:1, sign:+1 }]
 *
 * Returns `null` if the expression is empty or unparseable.
 */
export function parseExpression(raw: string): DiceTerm[] | null {
  // Normalise: collapse whitespace, ensure leading sign exists
  const expr = raw.trim().replace(/\s+/g, '');
  if (!expr) return null;

  // Tokenise by splitting on + / -, keeping the delimiter as part of the next token.
  // We prepend a '+' so the first term also has an explicit sign.
  const normalised = (expr[0] === '-' ? '' : '+') + expr;

  // Split on + or - but keep the sign attached to each chunk
  const chunks = normalised.match(/[+-][^+-]+/g);
  if (!chunks) return null;

  const terms: DiceTerm[] = [];

  for (const chunk of chunks) {
    const sign: 1 | -1 = chunk[0] === '-' ? -1 : 1;
    const body = chunk.slice(1);

    // Matches "XdY" or just a number
    const diceMatch = body.match(/^(\d+)[dD](\d+)$/);
    const constMatch = body.match(/^(\d+)$/);

    if (diceMatch) {
      const count = parseInt(diceMatch[1], 10);
      const sides = parseInt(diceMatch[2], 10);
      if (count <= 0 || sides <= 0) return null;
      terms.push({ count, sides, sign });
    } else if (constMatch) {
      const value = parseInt(constMatch[1], 10);
      terms.push({ count: value, sides: 1, sign });
    } else {
      // Unknown token — bail out
      return null;
    }
  }

  return terms.length ? terms : null;
}

// ── Roller ─────────────────────────────────────────────────────────────────

/** Roll a single die with `sides` faces. */
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Execute a list of DiceTerms and return a full RollResult.
 * Pass `expression` as the human-readable label for the result.
 */
export function rollTerms(terms: DiceTerm[], expression: string): RollResult {
  const breakdown: DiceRoll[] = terms.map(term => {
    let rolls: number[];
    if (term.sides === 1) {
      // Flat constant — no randomness
      rolls = [term.count];
    } else {
      rolls = Array.from({ length: term.count }, () => rollDie(term.sides));
    }
    const sum = rolls.reduce((a, b) => a + b, 0);
    return { term, rolls, subtotal: term.sign * sum };
  });

  const total = breakdown.reduce((a, r) => a + r.subtotal, 0);
  return { expression, breakdown, total };
}

/**
 * Parse and roll a full dice expression string.
 * Returns `null` if the expression is invalid.
 */
export function rollExpression(raw: string): RollResult | null {
  const terms = parseExpression(raw);
  if (!terms) return null;
  return rollTerms(terms, raw.trim());
}

// ── Formatting helpers ────────────────────────────────────────────────────

/**
 * Format a RollResult into a multi-line breakdown string.
 *
 * Example output:
 *   2d6 + 1d8 + 3
 *   2d6 → [4, 2] = 6
 *   1d8 → [7] = 7
 *    +3
 *   ────────
 *   Total: 16
 */
export function formatResult(result: RollResult): string {
  const lines: string[] = [];

  for (const roll of result.breakdown) {
    const { term, rolls } = roll;
    const signChar = term.sign === -1 ? '−' : '+';

    if (term.sides === 1) {
      // Flat constant
      lines.push(`  ${signChar} ${term.count}`);
    } else {
      const diceLabel = `${term.count}d${term.sides}`;
      const rollsStr  = `[${rolls.join(', ')}]`;
      const sum       = rolls.reduce((a, b) => a + b, 0);
      lines.push(`  ${signChar} ${diceLabel} → ${rollsStr} = ${term.sign * sum}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build a compact expression string from a dict of dice counts + a modifier.
 * e.g. { d6: 2, d8: 1 } + mod 3  →  "2d6 + 1d8 + 3"
 */
export function buildExpression(
  counts: Partial<Record<number, number>>,
  modifier: number,
): string {
  const parts: string[] = [];
  for (const [sides, count] of Object.entries(counts)) {
    if ((count ?? 0) > 0) parts.push(`${count}d${sides}`);
  }
  if (modifier !== 0) parts.push(String(modifier));
  return parts.join(' + ') || '0';
}

// ── Variable substitution ─────────────────────────────────────────────────

export type DiceVars = Record<string, number>;

/**
 * Substitute named variables (e.g. MIG, DEX, PB) with their numeric values
 * before parsing. Matching is whole-word and case-insensitive.
 *
 * Negative substituted values are wrapped in parens so the parser sees them
 * as valid constants, e.g. -2 → (-2). Positive values substitute directly.
 */
export function resolveVariables(expr: string, vars: DiceVars): string {
  return Object.entries(vars).reduce((acc, [key, val]) => {
    const replacement = val < 0 ? `(${val})` : String(val);
    return acc.replace(new RegExp(`\\b${key}\\b`, 'gi'), replacement);
  }, expr);
}
