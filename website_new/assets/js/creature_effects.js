// =============================================
// Creature passives: editor for the "effects" a passive applies on its own
// (umbrales, immunities, senses, speed, extra damage on attacks). Used by the
// creature builder (assets/html/creature_builder.html) and the ability library
// (tools/creature_editor.py). The stat block applies them: applyTraitEffects in
// assets/js/creature_loader.js (and website.py for the simulator).
//
//   effects: { umbrales: [{ categories, steps, flat?, choose?, amount? }],
//              immune: [...], senses: [...], speed: [...],
//              extra_damage: [{ dice, type, on, choose?, dice_value? }] }
//
// Markup: CreatureEffects.html(effects, opts) inside an element with data-ce-owner;
// pass that element's input / change / click events to CreatureEffects.input / .click.
// =============================================
(function () {
  const CATS = ['General', 'Físico', 'Magia', 'Cortante', 'Perforante', 'Contundente', 'Fuego', 'Frío', 'Eléctrico',
    'Ácido', 'Sónico', 'Radiante', 'Necrótico', 'Psíquico', 'Fuerza', 'Arcano', 'Agua'];
  const TYPES = CATS.filter(c => !['General', 'Físico', 'Magia', 'Agua'].includes(c));
  const ON = [['fisicos', 'ataques físicos'], ['naturales', 'ataques naturales'], ['arma', 'ataques con arma'], ['todos', 'todos los ataques']];
  const LISTS = { immune: 'Inmunidades', senses: 'Sentidos', speed: 'Velocidad' };
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  function ensureAssets() {
    if (document.getElementById('ce-style')) return;
    const st = document.createElement('style');
    st.id = 'ce-style';
    st.textContent = `
.ce { border: 1px dashed rgba(255,242,0,.35); border-radius: 6px; padding: 8px 10px; display: grid; gap: 6px; margin-top: 4px; }
.ce-title { font-size: .78rem; font-weight: 700; color: var(--accent-gold, var(--gold, #fff200)); letter-spacing: .04em; display: flex; gap: 8px; align-items: center; }
.ce-title small { font-weight: 400; color: var(--text-muted, var(--text3, #999)); letter-spacing: 0; }
.ce-sub { font-size: .72rem; color: var(--text-muted, var(--text2, #aaa)); margin-top: 2px; }
.ce-row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.ce-row .inp { min-width: 0; }
.ce-cat { flex: 2 1 140px; } .ce-num { flex: 0 0 74px; width: 74px; } .ce-dice { flex: 0 0 90px; width: 90px; } .ce-on { flex: 1 1 140px; }
.ce-lists { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.ce-lists label { display: grid; gap: 2px; font-size: .72rem; color: var(--text-muted, var(--text2, #aaa)); }
.ce-chk { font-size: .72rem; color: var(--text-muted, var(--text2, #aaa)); display: inline-flex; gap: 4px; align-items: center; white-space: nowrap; cursor: pointer; }
.ce-hint { font-size: .75rem; color: var(--accent-gold, var(--gold, #fff200)); white-space: nowrap; min-width: 3.5em; }
.ce-warn { border-color: #e7a14a !important; }
.ce-x, .ce-add { background: none; border: 1px solid #555; color: var(--text-muted, #aaa); border-radius: 4px; cursor: pointer; font-size: .75rem; padding: 2px 8px; }
.ce-add { justify-self: start; }
.ce-x:hover { color: #e76a6a; border-color: #e76a6a; } .ce-add:hover { color: var(--accent-gold, #fff200); border-color: var(--accent-gold, #fff200); }
@media (max-width: 700px) { .ce-lists { grid-template-columns: 1fr; } }`;
    document.head.appendChild(st);
    for (const [id, opts] of [['ce-cats', CATS], ['ce-types', TYPES]]) {
      const dl = document.createElement('datalist');
      dl.id = id;
      dl.innerHTML = opts.map(o => `<option value="${esc(o)}">`).join('');
      document.body.appendChild(dl);
    }
  }

  // opts.creature: editing a creature's passive ("elige" items ask for the element)
  // opts.hint(kind, item) -> resolved value text ("= +4", "= 2d6") or ''
  function html(eff, opts = {}) {
    ensureAssets();
    eff = eff || {};
    const hint = (k, it) => (opts.hint && opts.hint(k, it)) || '';
    const choose = (path, it) => opts.creature ? '' :
      `<label class="ce-chk" title="Cada criatura elige el elemento al usar esta pasiva"><input type="checkbox" data-ce="${path}.choose" data-kind="bool" ${it.choose ? 'checked' : ''}>elige cada criatura</label>`;
    const need = it => opts.creature && it.choose && !String(it.categories || it.type || '').trim();
    const umbs = (eff.umbrales || []).map((u, i) => `<div class="ce-row">
        <input class="inp ce-cat${need(u) ? ' ce-warn' : ''}" list="ce-cats" data-ce="umbrales.${i}.categories" value="${esc(u.categories)}"
          placeholder="${opts.creature && u.choose ? 'Elige el elemento' : u.choose ? '(elige cada criatura)' : 'Magia, Fuego…'}">
        <input class="inp ce-num" type="number" step="1" data-ce="umbrales.${i}.steps" data-kind="num" value="${esc(u.steps ?? '')}" title="Pasos: múltiplos del salto de umbral del Tier (−1 = reduce un paso)" placeholder="pasos">
        <input class="inp ce-num" type="number" step="1" data-ce="umbrales.${i}.flat" data-kind="num" value="${esc(u.flat ?? '')}" title="Cantidad fija extra (opcional)" placeholder="+fijo">
        ${choose(`umbrales.${i}`, u)}<span class="ce-hint" data-ce-hint="umbrales.${i}">${esc(hint('umbral', u))}</span>
        <button type="button" class="ce-x" data-ce-del="umbrales.${i}" title="Quitar">✕</button></div>`).join('');
    const dmg = (eff.extra_damage || []).map((x, i) => `<div class="ce-row">
        <input class="inp ce-dice" data-ce="extra_damage.${i}.dice" value="${esc(x.dice)}" placeholder="DD" title="Dados: DD, DD+1, DD-1, 1d6…">
        <input class="inp ce-cat${need(x) ? ' ce-warn' : ''}" list="ce-types" data-ce="extra_damage.${i}.type" value="${esc(x.type)}"
          placeholder="${opts.creature && x.choose ? 'Elige el elemento' : x.choose ? '(elige cada criatura)' : 'Necrótico…'}">
        <select class="inp ce-on" data-ce="extra_damage.${i}.on">${ON.map(([v, l]) => `<option value="${v}" ${(x.on || 'fisicos') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        ${choose(`extra_damage.${i}`, x)}<span class="ce-hint" data-ce-hint="extra_damage.${i}">${esc(hint('damage', x))}</span>
        <button type="button" class="ce-x" data-ce-del="extra_damage.${i}" title="Quitar">✕</button></div>`).join('');
    const lists = Object.entries(LISTS).map(([k, l]) => `<label>${l} (comas)<input class="inp" data-ce="${k}" data-kind="csv" value="${esc((eff[k] || []).join(', '))}"
        placeholder="${{ immune: 'Miedo, Mentales…', senses: 'Visión a oscuras…', speed: 'Natación 1…' }[k]}"></label>`).join('');
    return `<div class="ce">
      <div class="ce-title">✦ Efectos automáticos <small>se añaden solos a la ficha</small></div>
      <div class="ce-sub">Umbrales · pasos del salto del Tier, sobre el umbral de ese tipo (o el Mágico / Físico / General)</div>
      ${umbs}<button type="button" class="ce-add" data-ce-add="umbrales">＋ Umbral</button>
      <div class="ce-lists">${lists}</div>
      <div class="ce-sub">Daño adicional al impactar · cuenta aparte para los umbrales</div>
      ${dmg}<button type="button" class="ce-add" data-ce-add="extra_damage">＋ Daño adicional</button>
    </div>`;
  }

  function setPath(eff, path, value) {
    const keys = path.split('.');
    let o = eff;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]] = o[keys[i]] || (/^\d+$/.test(keys[i + 1]) ? [] : {});
    const last = keys[keys.length - 1];
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) delete o[last];
    else o[last] = value;
  }

  // An input / change event inside the editor: updates eff. Returns true if it was ours;
  // "structural" = the editor should be re-rendered (a checkbox or select changed)
  function input(e, eff) {
    const t = e.target, path = t.dataset && t.dataset.ce;
    if (!path) return false;
    const kind = t.dataset.kind;
    let v = t.value;
    if (kind === 'bool') v = t.checked || undefined;
    else if (kind === 'num') v = v.trim() === '' || isNaN(+v) ? undefined : +v;
    else if (kind === 'csv') v = v.split(',').map(s => s.trim()).filter(Boolean);
    else v = v.trim() === '' ? undefined : v;
    setPath(eff, path, v);
    if (t.classList.contains('ce-warn') && t.value.trim()) t.classList.remove('ce-warn');  // element chosen
    return { structural: kind === 'bool' || t.tagName === 'SELECT' };
  }

  // A click inside the editor (add / remove a row). Returns true when eff changed.
  function click(e, eff) {
    const b = e.target.closest && e.target.closest('[data-ce-add],[data-ce-del]');
    if (!b) return false;
    if (b.dataset.ceAdd) {
      const k = b.dataset.ceAdd;
      (eff[k] = eff[k] || []).push(k === 'umbrales' ? { categories: '', steps: 1 } : { dice: 'DD', type: '', on: 'fisicos' });
    } else {
      const [k, i] = b.dataset.ceDel.split('.');
      (eff[k] || []).splice(+i, 1);
      if (eff[k] && !eff[k].length) delete eff[k];
    }
    return true;
  }

  function isEmpty(eff) {
    return !eff || !Object.keys(eff).some(k => Array.isArray(eff[k]) ? eff[k].length : eff[k] != null);
  }

  // Resolve the level-dependent values: umbral amount = steps × Salto + flat; dice_value from the dice formula
  function resolve(eff, ctx) {
    if (!eff) return;
    for (const u of eff.umbrales || []) u.amount = (+u.steps || 0) * (+ctx.salto || 0) + (+u.flat || 0);
    for (const x of eff.extra_damage || []) {
      if (x.dice) x.dice_value = ctx.dice ? ctx.dice(x.dice) : x.dice; else delete x.dice_value;
    }
  }

  // Keeps a creature's own element choices when the library version of the passive changes
  function mergeChoices(fresh, mine) {
    const out = JSON.parse(JSON.stringify(fresh || {}));
    for (const [k, f] of [['umbrales', 'categories'], ['extra_damage', 'type']])
      (out[k] || []).forEach((it, i) => { const old = ((mine || {})[k] || [])[i]; if (it.choose && old && old[f]) it[f] = old[f]; });
    return out;
  }

  function summary(eff) {
    if (isEmpty(eff)) return '';
    const sign = n => (n > 0 ? '+' : '') + n;
    const parts = [];
    for (const u of eff.umbrales || []) parts.push(`${u.categories || 'elemento'} ${sign(+u.steps || 0)} paso${Math.abs(+u.steps || 0) === 1 ? '' : 's'}${u.flat ? ' ' + sign(+u.flat) : ''}`);
    if ((eff.immune || []).length) parts.push('Inmune: ' + eff.immune.join(', '));
    if ((eff.senses || []).length) parts.push(eff.senses.join(', '));
    if ((eff.speed || []).length) parts.push(eff.speed.join(', '));
    for (const x of eff.extra_damage || []) parts.push(`+${x.dice} ${x.type || 'elemento'} (${(ON.find(o => o[0] === (x.on || 'fisicos')) || ON[0])[1]})`);
    return parts.join(' · ');
  }

  window.CreatureEffects = { html, input, click, isEmpty, resolve, mergeChoices, summary, ON };
})();
