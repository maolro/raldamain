// Dados tab: the Mesa de Pruebas dice roller (assets/js/mesa.js), same rules —
// dice buttons build a pool, a modifier, a free expression ("+5" = 1d20+5, "2d6+4"),
// and a history of rolls with every die shown (kept in this browser). A value clicked
// in a token's sheet is loaded into the pool (load), to adjust before rolling.

const DICE = [
  { sides: 4, img: '/dice/e/4.png' },
  { sides: 6, img: '/dice/e/6.png' },
  { sides: 8, img: '/dice/e/8.png' },
  { sides: 10, img: '/dice/e/x.png' },
  { sides: 12, img: '/dice/e/y.png' },
  { sides: 20, img: '/dice/e/z.png' },
  { sides: -6, img: '/dice/e/d.png', title: 'Desventaja (−1d6)' },
];
const HISTORY = 'raldamain.tablero.dice';
const MAX_HISTORY = 80;

type Term = { sign: number; count: number; sides: number } | { sign: number; value: number };
interface Roll { label: string; expr: string; breakdown: string; total: number; crit: boolean; time: number }

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rollDie = (sides: number) => 1 + Math.floor(Math.random() * sides);

/** "+5+(1d6)", "2d6 + 4", "-1d6" → terms, or null if it is not a roll */
export function parseRoll(expr: string): Term[] | null {
  const clean = String(expr || '').replace(/[()\s]/g, '').replace(/[−–]/g, '-').toLowerCase();
  if (!clean || clean === '-') return null;
  const re = /([+-]?)(?:(\d*)d(\d+)|(\d+))/gy;
  const terms: Term[] = [];
  let m: RegExpExecArray | null;
  while (re.lastIndex < clean.length && (m = re.exec(clean))) {
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3]) terms.push({ sign, count: parseInt(m[2] || '1', 10), sides: parseInt(m[3], 10) });
    else terms.push({ sign, value: parseInt(m[4], 10) });
  }
  if (re.lastIndex !== clean.length || !terms.length) return null;
  if (terms.some(t => 'count' in t && (t.count > 100 || t.sides > 1000 || t.sides < 1))) return null;
  return terms;
}

function evaluate(terms: Term[]) {
  let total = 0, crit = false;
  const parts = terms.map((t, i) => {
    const op = t.sign < 0 ? '−' : (i === 0 ? '' : '+');
    if ('value' in t) { total += t.sign * t.value; return `${op}${t.value}`; }
    const rolls = Array.from({ length: t.count }, () => rollDie(t.sides));
    total += t.sign * rolls.reduce((a, b) => a + b, 0);
    if (t.sides === 20 && t.sign > 0 && rolls.includes(20)) crit = true;
    const faces = rolls.map(r => `<span class="die-face ${r === t.sides ? 'die-max' : r === 1 ? 'die-min' : ''}">${r}</span>`).join('');
    return `${op}${t.count}d${t.sides}<span class="die-faces">${faces}</span>`;
  });
  return { total, crit, breakdown: parts.join(' ') };
}

export class DiceRoller {
  private pool = new Map<number, number>();   // sides → count (negative sides: a subtracted die)
  private mod = 0;
  private label = '';      // what the pool holds ("Lobo: Mordisco"), from a sheet
  private history: Roll[] = [];

  constructor(private el: HTMLElement, private toast: (msg: string, bad?: boolean) => void) {
    try { this.history = JSON.parse(localStorage.getItem(HISTORY) || '[]'); } catch { this.history = []; }
    el.innerHTML = `
      <div class="dice-grid">${DICE.map(d => `
        <button class="die-btn" data-sides="${d.sides}" title="${d.title || 'Añadir 1d' + d.sides}">
          <img src="${d.img}" alt=""><span>${d.sides < 0 ? '−d6' : 'd' + d.sides}</span></button>`).join('')}
      </div>
      <div class="dice-pool" id="dice-pool"></div>
      <div class="dice-controls">
        <div class="mod-ctrl" title="Modificador (también con la rueda del ratón)">
          <button class="mod-btn" data-mod="-1">−</button><span class="mod-value" id="mod-value">0</span><button class="mod-btn" data-mod="1">+</button>
        </div>
        <button class="roll-btn" id="roll-pool">Tirar</button>
        <button class="btn small" id="clear-pool">Limpiar</button>
      </div>
      <form class="expr-form" id="expr-form">
        <input class="inp" id="expr-input" placeholder="+5 (1d20+5), +5+1d6, 2d6+4…" autocomplete="off">
        <button class="btn small" type="submit" title="Tirar la expresión">🎲</button>
      </form>
      <div class="log-head-row"><span>Historial</span><button class="log-clear" id="clear-log">Borrar</button></div>
      <div class="dice-log" id="dice-log"></div>`;
    const $ = (id: string) => el.querySelector('#' + id) as HTMLElement;
    el.querySelector('.dice-grid')!.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('.die-btn');
      if (!b) return;
      const s = +b.dataset.sides!;
      if (!this.pool.size && !this.mod) this.label = '';
      this.pool.set(s, (this.pool.get(s) || 0) + 1);
      this.renderPool();
    });
    $('dice-pool').addEventListener('click', e => {
      const c = (e.target as HTMLElement).closest<HTMLElement>('.pool-chip');
      if (!c) return;
      const s = +c.dataset.sides!, n = (this.pool.get(s) || 0) - 1;
      if (n > 0) this.pool.set(s, n); else this.pool.delete(s);
      this.renderPool();
    });
    el.querySelectorAll<HTMLElement>('[data-mod]').forEach(b => b.addEventListener('click', () => { this.mod += +b.dataset.mod!; this.renderPool(); }));
    el.querySelector('.mod-ctrl')!.addEventListener('wheel', e => {
      e.preventDefault();
      this.mod += (e as WheelEvent).deltaY < 0 ? 1 : -1;
      this.renderPool();
    }, { passive: false });
    $('roll-pool').addEventListener('click', () => { const x = this.poolExpr(); if (x) this.roll(x, this.label || 'Reserva'); });
    $('clear-pool').addEventListener('click', () => { this.pool.clear(); this.mod = 0; this.label = ''; this.renderPool(); });
    $('expr-form').addEventListener('submit', e => {
      e.preventDefault();
      const inp = $('expr-input') as HTMLInputElement;
      if (inp.value.trim()) this.roll(inp.value.trim(), 'Expresión');
    });
    $('clear-log').addEventListener('click', () => { this.history = []; this.save(); this.renderLog(); });
    $('dice-log').addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-reroll]');
      const r = b && this.history[+b.dataset.reroll!];
      if (r) this.roll(r.expr, r.label);
    });
    this.renderPool();
    this.renderLog();
  }

  /** A value from a sheet ("+7+2d6", "2d6+4"): into the pool, ready to adjust and roll.
   *  A modifier is a tiro (1d20 + modifier); dice without a button go to the expression line. */
  load(expr: string, label: string) {
    const terms = parseRoll(expr);
    if (!terms) { this.toast(`No se puede tirar «${expr}»`, true); return; }
    if (/^\s*[+\-−]/.test(expr) && 'value' in terms[0]) terms.unshift({ sign: 1, count: 1, sides: 20 });
    const known = new Set(DICE.map(d => d.sides));
    if (!terms.every(t => 'value' in t || known.has(t.sign < 0 ? -t.sides : t.sides))) {
      const inp = this.el.querySelector('#expr-input') as HTMLInputElement;
      inp.value = expr;
      inp.focus();
      this.toast(`${label}: ajusta la expresión y pulsa 🎲`);
      return;
    }
    this.pool.clear();
    this.mod = 0;
    for (const t of terms) {
      if ('value' in t) this.mod += t.sign * t.value;
      else { const k = t.sign < 0 ? -t.sides : t.sides; this.pool.set(k, (this.pool.get(k) || 0) + t.count); }
    }
    this.label = label;
    this.renderPool();
    const el = this.el.querySelector('#dice-pool') as HTMLElement;
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  }

  /** The pool as an expression: d20 first ("1d20+1d6+4"), then the other dice in button order */
  private poolExpr() {
    const order = [...DICE].sort((x, y) => Number(y.sides === 20) - Number(x.sides === 20));
    const parts = order.filter(d => this.pool.get(d.sides))
      .map(d => d.sides < 0 ? `-${this.pool.get(d.sides)}d${-d.sides}` : `+${this.pool.get(d.sides)}d${d.sides}`);
    if (this.mod) parts.push(this.mod > 0 ? `+${this.mod}` : `${this.mod}`);
    return parts.join('').replace(/^\+/, '');
  }

  private renderPool() {
    const expr = this.poolExpr();
    const el = this.el.querySelector('#dice-pool')!;
    el.innerHTML = expr
      ? (this.label ? `<span class="pool-label">${esc(this.label)}</span>` : '')
        + DICE.filter(d => this.pool.get(d.sides)).map(d =>
          `<button class="pool-chip" data-sides="${d.sides}" title="Quitar uno">${d.sides < 0 ? '−' : ''}${this.pool.get(d.sides)}d${Math.abs(d.sides)} ×</button>`).join('')
        + (this.mod ? `<span class="pool-mod">${this.mod > 0 ? '+' : ''}${this.mod}</span>` : '')
        + `<span class="pool-expr">${esc(expr)}</span>`
      : '<span class="pool-empty">Pulsa un dado para añadirlo · solo modificador = 1d20 + mod</span>';
    this.el.querySelector('#mod-value')!.textContent = (this.mod > 0 ? '+' : '') + this.mod;
    (this.el.querySelector('#roll-pool') as HTMLButtonElement).disabled = !expr;
  }

  /** Roll an expression. A modifier on its own ("+5", "-1", "+5+1d6") is a tiro: 1d20 + modifier. */
  roll(expr: string, label = 'Tirada') {
    let terms = parseRoll(expr);
    if (!terms && /^\d+$/.test(expr.trim())) terms = parseRoll('+' + expr);   // "5" = +5
    if (!terms) { this.toast(`No se puede tirar «${expr}»`, true); return; }
    if ((/^\s*[+\-−]/.test(expr) || /^\d+$/.test(expr.trim())) && 'value' in terms[0]) terms.unshift({ sign: 1, count: 1, sides: 20 });
    const { total, crit, breakdown } = evaluate(terms);
    this.history.unshift({ label, expr: expr.replace(/[()]/g, ''), breakdown, total, crit, time: Date.now() });
    this.history.length = Math.min(this.history.length, MAX_HISTORY);
    this.save();
    this.renderLog(true);
  }

  private save() {
    try { localStorage.setItem(HISTORY, JSON.stringify(this.history)); } catch { /* private window */ }
  }

  private renderLog(fresh = false) {
    const log = this.el.querySelector('#dice-log')!;
    if (!this.history.length) {
      log.innerHTML = '<div class="log-empty">Sin tiradas todavía. Elige dados y pulsa Tirar, o escribe una expresión.</div>';
      return;
    }
    log.innerHTML = this.history.map((r, i) => `
      <div class="log-entry${r.crit ? ' crit' : ''}${fresh && i === 0 ? ' fresh' : ''}">
        <div class="log-head"><span class="log-label">${esc(r.label)}${r.crit ? ' <span class="log-crit">¡Crítico!</span>' : ''}</span>
          <span class="log-time">${new Date(r.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></div>
        <div class="log-body"><span class="log-breakdown">${r.breakdown}</span><span class="log-total">${r.total}</span></div>
        <button class="log-reroll" data-reroll="${i}" title="Repetir ${esc(r.expr)}">↻</button>
      </div>`).join('');
  }
}
