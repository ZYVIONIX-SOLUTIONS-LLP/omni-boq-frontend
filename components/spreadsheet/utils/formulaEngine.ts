// ============================================================================
// Lightweight spreadsheet formula engine.
//
// Supports:
//  - Arithmetic: + - * / ^ and unary minus, parentheses
//  - Comparisons: = <> < <= > >=
//  - String concatenation with &
//  - Cell refs (A1) and ranges (A1:B5), including cross reference expansion
//  - Functions: SUM, AVERAGE, COUNT, COUNTA, MIN, MAX, IF, CONCAT, ROUND, ABS,
//               AND, OR, NOT, TODAY, LEN, UPPER, LOWER, TRIM
//
// The evaluator receives a `resolver` object so it stays decoupled from the
// React/Zustand layer. It also records every cell it *reads* into
// `dependencies`, so the caller can build a dependency graph for
// auto-recalculation.
// ============================================================================

import { cellKey, colToLetter, letterToCol } from './cellUtils';

export type FormulaValue = number | string | boolean | null;

export interface FormulaResolver {
  /** Returns the *computed* value of a cell (already evaluated if it was itself a formula) */
  getCellValue(row: number, col: number): FormulaValue;
}

export interface EvalResult {
  value: FormulaValue;
  error?: string;
  /** Set of "row,col" keys this formula read, for dependency-graph tracking */
  dependencies: Set<string>;
}

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------
type TokenType =
  | 'number'
  | 'string'
  | 'ref'
  | 'range'
  | 'ident'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'eof';

interface Token {
  type: TokenType;
  value: string;
}

const CELL_REF_RE = /^\$?[A-Za-z]{1,3}\$?\d+/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // String literal
    if (ch === '"') {
      let j = i + 1;
      let s = '';
      while (j < n && input[j] !== '"') {
        s += input[j];
        j++;
      }
      tokens.push({ type: 'string', value: s });
      i = j + 1;
      continue;
    }

    // Range or cell ref: LETTER(S)+DIGITS optionally followed by :LETTER(S)+DIGITS
    const rest = input.slice(i);
    const refMatch = CELL_REF_RE.exec(rest);
    if (refMatch) {
      let matched = refMatch[0];
      let consumedLen = matched.length;
      // Check for range continuation
      if (rest[consumedLen] === ':') {
        const afterColon = rest.slice(consumedLen + 1);
        const secondMatch = CELL_REF_RE.exec(afterColon);
        if (secondMatch) {
          matched = matched + ':' + secondMatch[0];
          consumedLen = consumedLen + 1 + secondMatch[0].length;
          tokens.push({ type: 'range', value: matched.replace(/\$/g, '') });
          i += consumedLen;
          continue;
        }
      }
      tokens.push({ type: 'ref', value: matched.replace(/\$/g, '') });
      i += refMatch[0].length;
      continue;
    }

    // Number
    if (/[0-9.]/.test(ch)) {
      let j = i;
      let s = '';
      while (j < n && /[0-9.]/.test(input[j])) {
        s += input[j];
        j++;
      }
      tokens.push({ type: 'number', value: s });
      i = j;
      continue;
    }

    // Identifier (function name)
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      let s = '';
      while (j < n && /[A-Za-z0-9_]/.test(input[j])) {
        s += input[j];
        j++;
      }
      tokens.push({ type: 'ident', value: s.toUpperCase() });
      i = j;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma', value: ch });
      i++;
      continue;
    }

    // Two-char operators
    if (ch === '<' && input[i + 1] === '=') {
      tokens.push({ type: 'op', value: '<=' });
      i += 2;
      continue;
    }
    if (ch === '>' && input[i + 1] === '=') {
      tokens.push({ type: 'op', value: '>=' });
      i += 2;
      continue;
    }
    if (ch === '<' && input[i + 1] === '>') {
      tokens.push({ type: 'op', value: '<>' });
      i += 2;
      continue;
    }

    if ('+-*/^=<>&'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    // Unknown char, skip
    i++;
  }

  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------
type Node =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'ref'; row: number; col: number }
  | { kind: 'range'; startRow: number; startCol: number; endRow: number; endCol: number }
  | { kind: 'call'; name: string; args: Node[] }
  | { kind: 'unary'; op: string; expr: Node }
  | { kind: 'binary'; op: string; left: Node; right: Node };

function parseRefToken(text: string): { row: number; col: number } {
  const m = /^([A-Za-z]+)(\d+)$/.exec(text)!;
  return { row: parseInt(m[2], 10) - 1, col: letterToCol(m[1].toUpperCase()) };
}

class Parser {
  tokens: Token[];
  pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(): Token {
    return this.tokens[this.pos];
  }

  next(): Token {
    return this.tokens[this.pos++];
  }

  parseExpression(): Node {
    return this.parseComparison();
  }

  // Lowest precedence: = <> < <= > >=
  parseComparison(): Node {
    let left = this.parseConcat();
    while (this.peek().type === 'op' && ['=', '<>', '<', '<=', '>', '>='].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseConcat();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  // & string concatenation
  parseConcat(): Node {
    let left = this.parseAdditive();
    while (this.peek().type === 'op' && this.peek().value === '&') {
      this.next();
      const right = this.parseAdditive();
      left = { kind: 'binary', op: '&', left, right };
    }
    return left;
  }

  parseAdditive(): Node {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  parseMultiplicative(): Node {
    let left = this.parsePower();
    while (this.peek().type === 'op' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.next().value;
      const right = this.parsePower();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  parsePower(): Node {
    let left = this.parseUnary();
    while (this.peek().type === 'op' && this.peek().value === '^') {
      this.next();
      const right = this.parseUnary();
      left = { kind: 'binary', op: '^', left, right };
    }
    return left;
  }

  parseUnary(): Node {
    if (this.peek().type === 'op' && this.peek().value === '-') {
      this.next();
      return { kind: 'unary', op: '-', expr: this.parseUnary() };
    }
    if (this.peek().type === 'op' && this.peek().value === '+') {
      this.next();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  parsePrimary(): Node {
    const tok = this.peek();

    if (tok.type === 'number') {
      this.next();
      return { kind: 'num', value: parseFloat(tok.value) };
    }
    if (tok.type === 'string') {
      this.next();
      return { kind: 'str', value: tok.value };
    }
    if (tok.type === 'range') {
      this.next();
      const [a, b] = tok.value.split(':');
      const ra = parseRefToken(a);
      const rb = parseRefToken(b);
      return {
        kind: 'range',
        startRow: Math.min(ra.row, rb.row),
        startCol: Math.min(ra.col, rb.col),
        endRow: Math.max(ra.row, rb.row),
        endCol: Math.max(ra.col, rb.col),
      };
    }
    if (tok.type === 'ref') {
      this.next();
      const { row, col } = parseRefToken(tok.value);
      return { kind: 'ref', row, col };
    }
    if (tok.type === 'ident') {
      this.next();
      if (this.peek().type === 'lparen') {
        this.next(); // consume (
        const args: Node[] = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseExpression());
          while (this.peek().type === 'comma') {
            this.next();
            args.push(this.parseExpression());
          }
        }
        if (this.peek().type === 'rparen') this.next();
        return { kind: 'call', name: tok.value, args };
      }
      // Bare identifier like TRUE/FALSE
      if (tok.value === 'TRUE') return { kind: 'num', value: 1 };
      if (tok.value === 'FALSE') return { kind: 'num', value: 0 };
      return { kind: 'str', value: tok.value };
    }
    if (tok.type === 'lparen') {
      this.next();
      const expr = this.parseExpression();
      if (this.peek().type === 'rparen') this.next();
      return expr;
    }

    // Fallback: treat as empty
    return { kind: 'num', value: 0 };
  }
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------
class FormulaError extends Error {}

function toNumber(v: FormulaValue): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toBool(v: FormulaValue): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0 && v.toUpperCase() !== 'FALSE';
  return false;
}

function toStr(v: FormulaValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

export function evaluateFormula(formula: string, resolver: FormulaResolver): EvalResult {
  const dependencies = new Set<string>();

  const collectRange = (startRow: number, startCol: number, endRow: number, endCol: number): FormulaValue[] => {
    const out: FormulaValue[] = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        dependencies.add(cellKey(r, c));
        out.push(resolver.getCellValue(r, c));
      }
    }
    return out;
  };

  const evalNode = (node: Node): FormulaValue => {
    switch (node.kind) {
      case 'num':
        return node.value;
      case 'str':
        return node.value;
      case 'ref': {
        dependencies.add(cellKey(node.row, node.col));
        return resolver.getCellValue(node.row, node.col);
      }
      case 'range': {
        // A bare range outside of a function context: just return the first value
        const vals = collectRange(node.startRow, node.startCol, node.endRow, node.endCol);
        return vals.length > 0 ? vals[0] : null;
      }
      case 'unary': {
        const v = toNumber(evalNode(node.expr));
        return node.op === '-' ? -v : v;
      }
      case 'binary': {
        const l = evalNode(node.left);
        const r = evalNode(node.right);
        switch (node.op) {
          case '+':
            return toNumber(l) + toNumber(r);
          case '-':
            return toNumber(l) - toNumber(r);
          case '*':
            return toNumber(l) * toNumber(r);
          case '/': {
            const denom = toNumber(r);
            if (denom === 0) throw new FormulaError('#DIV/0!');
            return toNumber(l) / denom;
          }
          case '^':
            return Math.pow(toNumber(l), toNumber(r));
          case '&':
            return toStr(l) + toStr(r);
          case '=':
            return toStr(l) === toStr(r) || toNumber(l) === toNumber(r);
          case '<>':
            return !(toStr(l) === toStr(r) || toNumber(l) === toNumber(r));
          case '<':
            return toNumber(l) < toNumber(r);
          case '<=':
            return toNumber(l) <= toNumber(r);
          case '>':
            return toNumber(l) > toNumber(r);
          case '>=':
            return toNumber(l) >= toNumber(r);
          default:
            return null;
        }
      }
      case 'call':
        return evalCall(node);
      default:
        return null;
    }
  };

  const flattenArgs = (args: Node[]): FormulaValue[] => {
    const values: FormulaValue[] = [];
    for (const arg of args) {
      if (arg.kind === 'range') {
        values.push(...collectRange(arg.startRow, arg.startCol, arg.endRow, arg.endCol));
      } else {
        values.push(evalNode(arg));
      }
    }
    return values;
  };

  const evalCall = (node: { name: string; args: Node[] }): FormulaValue => {
    const { name, args } = node;
    switch (name) {
      case 'SUM': {
        const values = flattenArgs(args);
        return values.reduce((acc: number, v) => acc + (typeof v === 'number' || (typeof v === 'string' && v !== '' && !isNaN(Number(v))) ? toNumber(v) : 0), 0);
      }
      case 'AVERAGE': {
        const values = flattenArgs(args).filter((v) => v !== null && v !== '' && !isNaN(Number(v)));
        if (values.length === 0) return 0;
        const sum = values.reduce((acc: number, v) => acc + toNumber(v), 0);
        return sum / values.length;
      }
      case 'COUNT': {
        const values = flattenArgs(args);
        return values.filter((v) => v !== null && v !== '' && !isNaN(Number(v))).length;
      }
      case 'COUNTA': {
        const values = flattenArgs(args);
        return values.filter((v) => v !== null && v !== '').length;
      }
      case 'MIN': {
        const values = flattenArgs(args).map(toNumber);
        return values.length ? Math.min(...values) : 0;
      }
      case 'MAX': {
        const values = flattenArgs(args).map(toNumber);
        return values.length ? Math.max(...values) : 0;
      }
      case 'IF': {
        const cond = toBool(evalNode(args[0]));
        if (cond) return args[1] ? evalNode(args[1]) : true;
        return args[2] ? evalNode(args[2]) : false;
      }
      case 'CONCAT':
      case 'CONCATENATE': {
        const values = flattenArgs(args);
        return values.map(toStr).join('');
      }
      case 'ROUND': {
        const num = toNumber(evalNode(args[0]));
        const digits = args[1] ? toNumber(evalNode(args[1])) : 0;
        const factor = Math.pow(10, digits);
        return Math.round(num * factor) / factor;
      }
      case 'ABS':
        return Math.abs(toNumber(evalNode(args[0])));
      case 'AND':
        return flattenArgs(args).every(toBool);
      case 'OR':
        return flattenArgs(args).some(toBool);
      case 'NOT':
        return !toBool(evalNode(args[0]));
      case 'LEN':
        return toStr(evalNode(args[0])).length;
      case 'UPPER':
        return toStr(evalNode(args[0])).toUpperCase();
      case 'LOWER':
        return toStr(evalNode(args[0])).toLowerCase();
      case 'TRIM':
        return toStr(evalNode(args[0])).trim();
      case 'TODAY':
        return new Date().toLocaleDateString();
      default:
        throw new FormulaError('#NAME?');
    }
  };

  try {
    const tokens = tokenize(formula);
    const parser = new Parser(tokens);
    const ast = parser.parseExpression();
    const value = evalNode(ast);
    return { value, dependencies };
  } catch (e) {
    const message = e instanceof FormulaError ? e.message : '#ERROR!';
    return { value: null, error: message, dependencies };
  }
}

export { colToLetter };
