import React, { useState, useEffect, useRef } from 'react';
import './index.css';

// ─────────────────────────────────────────────────────────────────────────────
//  MATH ENGINE  –  tokenise → recursive-descent parse → evaluate
//  No eval(). Supports: + - × ÷ ^ %  |  sin cos tan asin acos atan
//                        sqrt cbrt log ln abs fact  |  π e constants
// ─────────────────────────────────────────────────────────────────────────────

function tokenize(raw) {
  const tokens = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (/\s/.test(ch)) { i++; continue; }

    // Numbers
    if (/\d/.test(ch) || ch === '.') {
      let num = '';
      while (i < raw.length && (/\d/.test(raw[i]) || raw[i] === '.')) num += raw[i++];
      tokens.push({ type: 'num', val: parseFloat(num) });
      continue;
    }

    // π constant
    if (ch === 'π') { tokens.push({ type: 'num', val: Math.PI }); i++; continue; }

    // Identifiers: function names and constant 'e'
    if (/[a-zA-Z]/.test(ch)) {
      let name = '';
      while (i < raw.length && /[a-zA-Z]/.test(raw[i])) name += raw[i++];
      if (name === 'e') {
        tokens.push({ type: 'num', val: Math.E });
      } else {
        tokens.push({ type: 'fn', val: name.toLowerCase() });
      }
      continue;
    }

    // Operators & parentheses
    if (ch === '+')           { tokens.push({ type: 'op', val: '+' }); i++; continue; }
    if (ch === '-')           { tokens.push({ type: 'op', val: '-' }); i++; continue; }
    if (ch === '×' || ch === '*') { tokens.push({ type: 'op', val: '*' }); i++; continue; }
    if (ch === '÷' || ch === '/') { tokens.push({ type: 'op', val: '/' }); i++; continue; }
    if (ch === '^')           { tokens.push({ type: 'op', val: '^' }); i++; continue; }
    if (ch === '%')           { tokens.push({ type: 'op', val: '%' }); i++; continue; }
    if (ch === '(')           { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')')           { tokens.push({ type: 'rparen' }); i++; continue; }
    i++; // skip unknown
  }
  return tokens;
}

class Parser {
  constructor(tokens, angleMode) {
    this.t = tokens;
    this.i = 0;
    this.deg = angleMode !== 'RAD';
  }

  peek()   { return this.t[this.i]; }
  next()   { return this.t[this.i++]; }

  expect(type, val) {
    const tok = this.next();
    if (!tok || tok.type !== type || (val !== undefined && tok.val !== val)) {
      throw new Error(`Expected '${val !== undefined ? val : type}'`);
    }
    return tok;
  }

  toRad(a)   { return this.deg ? a * Math.PI / 180 : a; }
  fromRad(a) { return this.deg ? a * 180 / Math.PI : a; }

  parse() {
    const val = this.expr();
    if (this.i < this.t.length) throw new Error('Unexpected character');
    return val;
  }

  expr() { return this.addSub(); }

  addSub() {
    let v = this.mulDiv();
    while (this.peek() && (this.peek().val === '+' || this.peek().val === '-')) {
      const op = this.next().val;
      const r = this.mulDiv();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  mulDiv() {
    let v = this.power();
    while (this.peek() && ['*', '/', '%'].includes(this.peek().val)) {
      const op = this.next().val;
      const r = this.power();
      if (op === '*')      v *= r;
      else if (op === '/') { if (r === 0) throw new Error('Division by zero'); v /= r; }
      else                 v %= r;
    }
    return v;
  }

  power() {
    const base = this.unary();
    if (this.peek()?.val === '^') {
      this.next();
      return Math.pow(base, this.unary()); // right-associative
    }
    return base;
  }

  unary() {
    if (this.peek()?.val === '-') { this.next(); return -this.call(); }
    if (this.peek()?.val === '+') { this.next(); return  this.call(); }
    return this.call();
  }

  call() {
    if (this.peek()?.type === 'fn') {
      const name = this.next().val;
      if (this.peek()?.type !== 'lparen') throw new Error(`Expected '(' after ${name}`);
      this.next(); // consume (
      const arg = this.expr();
      if (this.peek()?.type !== 'rparen') throw new Error('Missing closing )');
      this.next(); // consume )
      return this.applyFn(name, arg);
    }
    return this.primary();
  }

  applyFn(name, arg) {
    switch (name) {
      case 'sin':  return Math.sin(this.toRad(arg));
      case 'cos':  return Math.cos(this.toRad(arg));
      case 'tan': {
        const r = this.toRad(arg);
        if (Math.abs(Math.cos(r)) < 1e-14) throw new Error('Undefined (tangent at 90°/270°)');
        return Math.tan(r);
      }
      case 'asin':
        if (arg < -1 || arg > 1) throw new Error('Domain error: |x| ≤ 1 required for asin');
        return this.fromRad(Math.asin(arg));
      case 'acos':
        if (arg < -1 || arg > 1) throw new Error('Domain error: |x| ≤ 1 required for acos');
        return this.fromRad(Math.acos(arg));
      case 'atan': return this.fromRad(Math.atan(arg));
      case 'sqrt':
        if (arg < 0) throw new Error('Domain error: √ requires x ≥ 0');
        return Math.sqrt(arg);
      case 'cbrt': return Math.cbrt(arg);
      case 'log':
        if (arg <= 0) throw new Error('Domain error: log requires x > 0');
        return Math.log10(arg);
      case 'ln':
        if (arg <= 0) throw new Error('Domain error: ln requires x > 0');
        return Math.log(arg);
      case 'abs':  return Math.abs(arg);
      case 'fact': {
        if (!Number.isInteger(arg) || arg < 0) throw new Error('Factorial requires a non-negative integer');
        if (arg > 170) throw new Error('Factorial overflow (n > 170)');
        let r = 1; for (let k = 2; k <= arg; k++) r *= k; return r;
      }
      default: throw new Error(`Unknown function: ${name}`);
    }
  }

  primary() {
    const tok = this.peek();
    if (!tok) throw new Error('Unexpected end of expression');
    if (tok.type === 'num') { this.next(); return tok.val; }
    if (tok.type === 'lparen') {
      this.next();
      const val = this.expr();
      if (this.peek()?.type !== 'rparen') throw new Error('Missing closing )');
      this.next();
      return val;
    }
    throw new Error(`Unexpected token: ${tok.val}`);
  }
}

/**
 * Evaluate a calculator expression string.
 * Returns a number, or null for empty input.
 * Throws an Error with a descriptive message on parse/math errors.
 */
export function evaluate(expr, angleMode = 'DEG') {
  if (!expr || !expr.trim()) return null;
  const tokens = tokenize(expr.trim());
  if (!tokens.length) return null;
  const result = new Parser(tokens, angleMode).parse();
  if (!isFinite(result)) throw new Error('Result is not finite');
  // Round to 12 significant figures to avoid floating-point display artefacts
  // e.g. 0.1 + 0.2 → 0.3 (not 0.30000000000000004)
  return parseFloat(result.toPrecision(12));
}

// ─────────────────────────────────────────────────────────────────────────────
//  FORMAT HELPER
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n === null || n === undefined) return '';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-7)) return n.toExponential(6);
  return parseFloat(n.toFixed(10)).toString();
}

// ─────────────────────────────────────────────────────────────────────────────
//  APP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [expr,      setExpr]      = useState('');
  const [preview,   setPreview]   = useState('');
  const [history,   setHistory]   = useState([]);
  const [dark,      setDark]      = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [angleMode, setAngleMode] = useState('DEG');
  const [showHist,  setShowHist]  = useState(false);
  const [mem,       setMem]       = useState(0);
  const [second,    setSecond]    = useState(false);
  const [error,     setError]     = useState('');
  const [evaluated, setEvaluated] = useState(false);

  // Keep a ref to the latest handlers so the keyboard listener never goes stale
  const handlerRef = useRef(null);

  // Apply/remove dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Live preview while typing
  useEffect(() => {
    if (!expr) { setPreview(''); setError(''); return; }
    try {
      const r = evaluate(expr, angleMode);
      setPreview(r !== null ? fmt(r) : '');
      setError('');
    } catch {
      setPreview('');
    }
  }, [expr, angleMode]);

  // ── Input handlers ────────────────────────────────────────────────────────

  const append = (ch) => {
    setError('');
    if (evaluated) {
      setEvaluated(false);
      // After '=': operator → continue from result; digit → start fresh
      if (['+', '-', '×', '÷', '^', '%'].includes(ch)) {
        setExpr(prev => prev + ch);
      } else {
        setExpr(ch);
      }
    } else {
      setExpr(prev => prev + ch);
    }
  };

  const handleEquals = () => {
    if (!expr) return;
    try {
      const r = evaluate(expr, angleMode);
      if (r === null) return;
      const res = fmt(r);
      setHistory(h => [{ expr, result: res }, ...h.slice(0, 49)]);
      setExpr(res);
      setPreview('');
      setError('');
      setEvaluated(true);
    } catch (e) {
      setError(e.message || 'Invalid expression');
    }
  };

  const clear     = () => { setExpr(''); setPreview(''); setError(''); setEvaluated(false); };
  const backspace = () => { setExpr(p => p.slice(0, -1)); setError(''); setEvaluated(false); };

  const toggleSign = () => {
    if (!expr) return;
    setExpr(expr.startsWith('-') ? expr.slice(1) : '-' + expr);
    setEvaluated(false);
  };

  const percent = () => {
    try {
      const r = evaluate(expr, angleMode);
      if (r !== null) { setExpr(fmt(r / 100)); setEvaluated(false); }
    } catch {}
  };

  // ── Memory ────────────────────────────────────────────────────────────────

  const mclear  = () => setMem(0);
  const mrecall = () => append(fmt(mem));
  const mplus   = () => { try { const r = evaluate(expr, angleMode); if (r !== null) setMem(m => m + r); } catch {} };
  const mminus  = () => { try { const r = evaluate(expr, angleMode); if (r !== null) setMem(m => m - r); } catch {} };
  const mstore  = () => { try { const r = evaluate(expr, angleMode); if (r !== null) setMem(r);         } catch {} };

  // ── Copy result ───────────────────────────────────────────────────────────

  const copyResult = () => navigator.clipboard?.writeText(preview || expr);

  // ── Keyboard support ──────────────────────────────────────────────────────

  // Always point the ref at the latest version of the handler (no stale closure)
  handlerRef.current = (e) => {
    const { key } = e;
    if (/^\d$/.test(key) || key === '.') { append(key); return; }
    if (key === '+') { append('+'); return; }
    if (key === '-') { append('-'); return; }
    if (key === '*') { append('×'); return; }
    if (key === '/') { e.preventDefault(); append('÷'); return; }
    if (key === '^') { append('^'); return; }
    if (key === '%') { append('%'); return; }
    if (key === '(' || key === ')') { append(key); return; }
    if (key === 'Enter' || key === '=') { handleEquals(); return; }
    if (key === 'Backspace') { backspace(); return; }
    if (key === 'Escape' || key === 'Delete') { clear(); return; }
  };

  useEffect(() => {
    const listener = (e) => handlerRef.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []); // register once; ref keeps the handler current

  // ── Style helpers (dark / light) ──────────────────────────────────────────

  const bg     = dark ? 'bg-gray-900'  : 'bg-gradient-to-br from-slate-100 to-blue-100';
  const card   = dark ? 'bg-gray-800'  : 'bg-white';
  const hdr    = dark ? 'bg-gray-700'  : 'bg-gray-50 border-b border-gray-200';
  const dimTxt = dark ? 'text-gray-400' : 'text-gray-500';
  const mainTxt= dark ? 'text-white'   : 'text-gray-800';

  const hdrBtn = `text-xs px-2.5 py-1 rounded-full border transition-colors
                  ${dark ? 'border-gray-500 text-gray-300 hover:bg-gray-600'
                         : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`;

  const numBtn = `calc-btn py-4 text-xl focus:ring-blue-400
                  ${dark ? 'bg-gray-700 text-white hover:bg-gray-600'
                         : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`;

  const opBtn  = `calc-btn py-4 text-xl focus:ring-orange-400
                  ${dark ? 'bg-orange-600 text-white hover:bg-orange-500'
                         : 'bg-orange-400 text-white hover:bg-orange-500'}`;

  const fnBtn  = `calc-btn py-4 text-sm focus:ring-gray-400
                  ${dark ? 'bg-gray-600 text-gray-100 hover:bg-gray-500'
                         : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;

  const sciBtn = `calc-btn py-2 text-xs focus:ring-1 focus:ring-blue-300 rounded-xl
                  ${dark ? 'bg-gray-700 text-blue-300 hover:bg-gray-600'
                         : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`;

  const memBtn = `calc-btn py-1.5 text-xs rounded-lg focus:ring-purple-300
                  ${dark ? 'bg-gray-700 text-purple-300 hover:bg-gray-600'
                         : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`;

  // ── Scientific button config (supports "2nd" toggle) ──────────────────────

  // Helper: returns { label, fn, aria } respecting the 2nd toggle
  const S = (lbl, fn, lbl2, fn2) => ({
    label: second && lbl2 ? lbl2 : lbl,
    fn:    second && fn2  ? fn2  : fn,
    aria:  second && lbl2 ? lbl2 : lbl,
  });

  const sciRows = [
    [
      S('x²',  '^2',    'x³', '^3'),
      S('√',   'sqrt(', '∛',  'cbrt('),
      S('sin', 'sin(',  'asin','asin('),
      S('cos', 'cos(',  'acos','acos('),
      S('tan', 'tan(',  'atan','atan('),
    ],
    [
      { label: 'xʸ',  fn: '^',     aria: 'Power' },
      S('log',  'log(', '10ˣ', '10^('),
      S('ln',   'ln(',  'eˣ',  'e^('),
      { label: '|x|', fn: 'abs(',  aria: 'Absolute value' },
      { label: 'n!',  fn: 'fact(', aria: 'Factorial' },
    ],
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${bg}`}>
      <div
        className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden ${card}`}
        role="application"
        aria-label="Scientific Calculator"
      >

        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-4 py-2.5 ${hdr}`}>
          <span className={`text-xs font-semibold ${dimTxt}`}>{angleMode}</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setAngleMode(m => m === 'DEG' ? 'RAD' : 'DEG')}
              className={hdrBtn}
              aria-label={`Switch to ${angleMode === 'DEG' ? 'radians' : 'degrees'}`}
            >
              {angleMode === 'DEG' ? 'RAD' : 'DEG'}
            </button>
            <button
              onClick={() => setShowHist(h => !h)}
              className={hdrBtn}
              aria-label="Toggle history"
              aria-pressed={showHist}
            >
              📋
            </button>
            <button
              onClick={() => setDark(d => !d)}
              className={hdrBtn}
              aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* ── History Panel ── */}
        {showHist && (
          <div
            className={`max-h-40 overflow-y-auto hist-scroll border-b
                        ${dark ? 'border-gray-600' : 'border-gray-200'}`}
            aria-label="Calculation history"
            role="region"
          >
            <div className={`sticky top-0 flex items-center justify-between px-4 py-1.5
                             ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <span className={`text-xs font-medium ${dimTxt}`}>History</span>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-red-400 hover:text-red-300"
                  aria-label="Clear all history"
                >
                  Clear
                </button>
              )}
            </div>
            {history.length === 0
              ? <p className={`text-xs text-center py-4 ${dimTxt}`}>No calculations yet</p>
              : (
                <ul>
                  {history.map((h, idx) => (
                    <li
                      key={idx}
                      className={`flex justify-between items-center px-4 py-1.5 cursor-pointer
                                  border-b last:border-b-0 text-xs
                                  ${dark ? 'border-gray-600 hover:bg-gray-700'
                                         : 'border-gray-100 hover:bg-blue-50'}`}
                      onClick={() => { setExpr(h.result); setEvaluated(true); setShowHist(false); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { setExpr(h.result); setEvaluated(true); setShowHist(false); }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Reuse result ${h.result} from ${h.expr}`}
                    >
                      <span className={dimTxt}>{h.expr}</span>
                      <span className={`font-medium ml-2 ${mainTxt}`}>= {h.result}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
        )}

        {/* ── Display ── */}
        <div className={`px-5 pt-4 pb-2 ${card}`} aria-live="polite" aria-atomic="true">
          {error && (
            <p className="text-red-400 text-xs text-right mb-1" role="alert">{error}</p>
          )}
          <p
            data-testid="expression"
            className={`text-sm text-right min-h-5 overflow-x-auto whitespace-nowrap select-all ${dimTxt}`}
            aria-label="Expression"
          >
            {expr || '0'}
          </p>
          <p
            data-testid="preview"
            className={`text-3xl font-light text-right mt-0.5 min-h-9 overflow-x-auto
                        whitespace-nowrap ${mainTxt}`}
            aria-label={preview && preview !== expr ? `Preview: ${preview}` : ''}
          >
            {preview && preview !== expr ? preview : ''}
          </p>
        </div>

        {/* ── Memory Row ── */}
        <div className={`grid grid-cols-5 gap-1 px-3 pb-1 ${card}`}>
          {[
            { label: 'MC', fn: mclear,  aria: 'Memory clear'    },
            { label: 'MR', fn: mrecall, aria: 'Memory recall'   },
            { label: 'M+', fn: mplus,   aria: 'Memory add'      },
            { label: 'M−', fn: mminus,  aria: 'Memory subtract' },
            { label: 'MS', fn: mstore,  aria: 'Memory store'    },
          ].map(({ label, fn, aria }) => (
            <button key={label} onClick={fn} aria-label={aria} className={memBtn}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Scientific Rows ── */}
        <div className={`px-3 pb-1 ${card}`}>
          {/* 2nd / π / e / ( / ) */}
          <div className="grid grid-cols-5 gap-1 mb-1">
            <button
              onClick={() => setSecond(s => !s)}
              aria-label="Toggle second function"
              aria-pressed={second}
              className={`calc-btn py-2 text-xs rounded-xl focus:ring-1 transition-all
                          ${second
                            ? 'bg-orange-400 text-white'
                            : dark ? 'bg-gray-700 text-orange-300 hover:bg-gray-600'
                                   : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
            >
              2nd
            </button>
            {[
              { label: 'π', fn: 'π', aria: 'Pi constant'       },
              { label: 'e', fn: 'e', aria: "Euler's number"    },
              { label: '(', fn: '(', aria: 'Open parenthesis'  },
              { label: ')', fn: ')', aria: 'Close parenthesis' },
            ].map(({ label, fn, aria }) => (
              <button key={label} onClick={() => append(fn)} aria-label={aria} className={sciBtn}>
                {label}
              </button>
            ))}
          </div>

          {sciRows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-5 gap-1 mb-1">
              {row.map(({ label, fn, aria }) => (
                <button key={label} onClick={() => append(fn)} aria-label={aria} className={sciBtn}>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── Main Keypad ── */}
        <div className={`grid grid-cols-4 gap-2 px-3 pb-3 ${card}`}>
          {/* Row 1: AC  +/−  %  ÷ */}
          <button
            onClick={clear}
            aria-label="All clear"
            className={`calc-btn py-4 text-sm focus:ring-red-400
                        ${dark ? 'bg-red-900 text-red-200 hover:bg-red-800'
                               : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
          >
            AC
          </button>
          <button onClick={toggleSign} aria-label="Toggle sign"      className={fnBtn}>+/−</button>
          <button onClick={percent}    aria-label="Percent"           className={fnBtn}>%</button>
          <button onClick={() => append('÷')} aria-label="Divide"    className={opBtn}>÷</button>

          {/* Row 2: 7 8 9 × */}
          {['7','8','9'].map(n => (
            <button key={n} onClick={() => append(n)} aria-label={n} className={numBtn}>{n}</button>
          ))}
          <button onClick={() => append('×')} aria-label="Multiply"  className={opBtn}>×</button>

          {/* Row 3: 4 5 6 − */}
          {['4','5','6'].map(n => (
            <button key={n} onClick={() => append(n)} aria-label={n} className={numBtn}>{n}</button>
          ))}
          <button onClick={() => append('-')} aria-label="Subtract"  className={opBtn}>−</button>

          {/* Row 4: 1 2 3 + */}
          {['1','2','3'].map(n => (
            <button key={n} onClick={() => append(n)} aria-label={n} className={numBtn}>{n}</button>
          ))}
          <button onClick={() => append('+')} aria-label="Add"       className={opBtn}>+</button>

          {/* Row 5: ⌫ 0 . = */}
          <button onClick={backspace}          aria-label="Backspace"      className={fnBtn}>⌫</button>
          <button onClick={() => append('0')}  aria-label="0"              className={numBtn}>0</button>
          <button onClick={() => append('.')}  aria-label="Decimal point"  className={numBtn}>.</button>
          <button
            onClick={handleEquals}
            aria-label="Equals"
            className={`calc-btn py-4 text-xl focus:ring-blue-400
                        ${dark ? 'bg-blue-600 text-white hover:bg-blue-500'
                               : 'bg-blue-500 text-white hover:bg-blue-600'}`}
          >
            =
          </button>
        </div>

        {/* ── Footer: memory indicator + copy ── */}
        <div className={`flex justify-between items-center px-4 pb-3 ${card}`}>
          <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            {mem !== 0 ? `M: ${fmt(mem)}` : ''}
          </span>
          <button
            onClick={copyResult}
            className={`text-xs px-3 py-1 rounded-full transition-colors
                        ${dark ? 'text-gray-500 hover:text-gray-300'
                               : 'text-gray-400 hover:text-gray-600'}`}
            aria-label="Copy result to clipboard"
          >
            Copy
          </button>
        </div>

      </div>
    </div>
  );
}
