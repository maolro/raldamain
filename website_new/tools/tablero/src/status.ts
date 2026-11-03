// Status effects (efectos de estado) on tokens: Ralentizado II, Enfermado I, Cegado…
//
// Defined in data/status_effects.json (Rank Editor → ✦ Estados). Each level has
// penalizadores — Desventaja dice (−1d6 each) and/or a flat modifier on some kinds of
// roll that use some stats — and turn limits (fewer actions or reactions, none,
// abilities costing more). A token keeps [{ id, level }]; rolls made from its sheet
// get the penalties of the ones that apply (see penaltiesFor).
import type { BoardItem, TokenStatus } from './types';

export interface Penalty { rolls?: string[]; stats?: string[]; dice?: number; mod?: number }
export interface StatusLevel {
  name?: string;
  penalties?: Penalty[];
  no_actions?: boolean;
  no_reactions?: boolean;
  actions?: number;
  reactions?: number;
  extra_cost?: number;
  notes?: string;
}
export interface StatusEffect { id: string; name: string; description?: string; levels: StatusLevel[] }

/** What a roll from a sheet is: its kind and the stats it uses (from tools/tablero/ficha/ficha.js) */
export type RollKind = 'Ataque' | 'Defensa' | 'Salvación' | 'Talento' | 'Habilidad' | 'Iniciativa' | 'Daño' | 'Otro';
const PENALIZED: string[] = ['Ataque', 'Defensa', 'Salvación', 'Talento', 'Habilidad', 'Iniciativa'];

const join = (a: string[]) => a.length < 2 ? (a[0] || '') : `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}`;
// marker colours, by effect (stable: from its id)
const COLORS = ['#e07b39', '#9b59d0', '#3cb44b', '#e6194b', '#42a5f5', '#c9a227', '#20c997', '#f032e6'];

export class Statuses {
  list: StatusEffect[] = [];

  async load() {
    try {
      const r = await fetch('/data/status_effects.json', { cache: 'no-store' });
      this.list = r.ok ? ((await r.json()).effects || []) : [];
    } catch { this.list = []; }
  }

  get(id: string) { return this.list.find(e => e.id === id); }

  /** The effect and level of a token's status (null if it no longer exists) */
  resolve(s: TokenStatus): { effect: StatusEffect; level: StatusLevel } | null {
    const effect = this.get(s.id);
    const level = effect?.levels[Math.min(s.level, effect.levels.length - 1)];
    return effect && level ? { effect, level } : null;
  }

  /** "Ralentizado II", "Miedo: Asustado", "Cegado" */
  label(s: TokenStatus) {
    const r = this.resolve(s);
    if (!r) return s.id;
    const n = r.level.name || '';
    return !n ? r.effect.name : /^[IVX]+$/.test(n) ? `${r.effect.name} ${n}` : `${r.effect.name}: ${n}`;
  }

  /** The marker on the token: "RAL II", "ASU", "CEG" */
  short(s: TokenStatus) {
    const r = this.resolve(s);
    if (!r) return '?';
    const n = r.level.name || '';
    const abbr = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 3).toUpperCase();
    return !n ? abbr(r.effect.name) : /^[IVX]+$/.test(n) ? `${abbr(r.effect.name)} ${n}` : abbr(n);
  }

  color(id: string) {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return COLORS[h % COLORS.length];
  }

  /** "Desventaja en Ataque y Defensa · Desventaja en Talento, Habilidad y Salvación de DES · sin reacciones" */
  summary(lv: StatusLevel) {
    const out = (lv.penalties || []).map(p => {
      const what: string[] = [];
      if ((p.dice || 0) > 0) what.push(p.dice! > 1 ? `Desventaja ×${p.dice}` : 'Desventaja');
      if (p.mod) what.push((p.mod > 0 ? '+' : '') + p.mod);
      if (!what.length) return '';
      return `${what.join(' y ')} en ${(p.rolls || []).length ? join(p.rolls!) : 'todos los tiros'}${(p.stats || []).length ? ' de ' + join(p.stats!) : ''}`;
    }).filter(Boolean);
    if (lv.no_actions) out.push('sin acciones'); else if (lv.actions) out.push(`${lv.actions} acción${lv.actions > 1 ? 'es' : ''} menos`);
    if (lv.no_reactions) out.push('sin reacciones'); else if (lv.reactions) out.push(`${lv.reactions} reacción${lv.reactions > 1 ? 'es' : ''} menos`);
    if (lv.extra_cost) out.push(`habilidades +${lv.extra_cost} acción`);
    if (lv.notes) out.push(lv.notes);
    return out.join(' · ') || 'Sin efectos de tirada';
  }

  /** What a token's statuses do to a roll of this kind with these stats. Within one status
   *  the strongest matching penalty counts; different statuses add up (as the rules say). */
  penaltiesFor(item: BoardItem, kind: string, stats: string[]) {
    let dice = 0, mod = 0;
    const from: string[] = [];
    if (!PENALIZED.includes(kind)) return { dice, mod, from };
    for (const s of item.statuses || []) {
      const r = this.resolve(s);
      if (!r) continue;
      const hits = (r.level.penalties || []).filter(p =>
        (!(p.rolls || []).length || p.rolls!.includes(kind)) && (!(p.stats || []).length || p.stats!.some(x => stats.includes(x))));
      if (!hits.length) continue;
      const d = Math.max(...hits.map(p => p.dice || 0)), m = hits.reduce((a, p) => a + (p.mod || 0), 0);
      if (!d && !m) continue;
      dice += d;
      mod += m;
      from.push(`${this.label(s)}: ${[d ? (d > 1 ? `Desventaja ×${d}` : 'Desventaja') : '', m ? (m > 0 ? '+' : '') + m : ''].filter(Boolean).join(', ')}`);
    }
    return { dice, mod, from };
  }
}
