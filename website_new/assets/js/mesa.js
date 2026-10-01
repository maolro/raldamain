// =============================================
// MESA DE PRUEBAS — stat block loader + dice roller
// The stat block itself is the builder's v-statblock (main.js computes it);
// .md sheets are rendered with marked.
// =============================================

// ── Dice ─────────────────────────────────────────────────────────────────────

const DICE = [
    { sides: 4,  img: '/dice/e/4.png' },
    { sides: 6,  img: '/dice/e/6.png' },
    { sides: 8,  img: '/dice/e/8.png' },
    { sides: 10, img: '/dice/e/x.png' },
    { sides: 12, img: '/dice/e/y.png' },
    { sides: 20, img: '/dice/e/z.png' },
    { sides: -6, img: '/dice/e/d.png', title: 'Desventaja (−1d6)' },
];

const pool = {};          // sides → count (negative sides = subtracted die)
let poolMod = 0;

function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

// "+5+(1d6)", "2d6 + 4", "-1d6" → [{ sign, count, sides } | { sign, value }] or null if invalid
function parseRoll(expr) {
    const clean = String(expr || '').replace(/[()\s]/g, '').replace(/[−–]/g, '-');
    if (!clean || clean === '-') return null;
    const re = /([+\-]?)(?:(\d*)d(\d+)|(\d+))/gy;
    const terms = [];
    let m;
    while (re.lastIndex < clean.length && (m = re.exec(clean))) {
        const sign = m[1] === '-' ? -1 : 1;
        if (m[3]) terms.push({ sign, count: parseInt(m[2] || '1', 10), sides: parseInt(m[3], 10) });
        else terms.push({ sign, value: parseInt(m[4], 10) });
    }
    if (re.lastIndex !== clean.length || !terms.length) return null;
    if (terms.some(t => t.count > 100 || t.sides > 1000)) return null;
    return terms;
}

function evaluate(terms) {
    let total = 0;
    const parts = terms.map((t, i) => {
        const op = t.sign < 0 ? '−' : (i === 0 ? '' : '+');
        if (t.value !== undefined) {
            total += t.sign * t.value;
            return `${op}${t.value}`;
        }
        const rolls = Array.from({ length: t.count }, () => rollDie(t.sides));
        total += t.sign * rolls.reduce((a, b) => a + b, 0);
        const shown = rolls.map(r => {
            const cls = r === t.sides ? 'die-max' : (r === 1 ? 'die-min' : '');
            return `<span class="die-face ${cls}">${r}</span>`;
        }).join('');
        return `${op}${t.count}d${t.sides}<span class="die-faces">${shown}</span>`;
    });
    return { total, breakdown: parts.join(' ') };
}

// A modifier expression ("+5", "-1", "+5+1d6") is a tiro: 1d20 + modifier.
// Anything starting with dice ("2d6+4", "+1d6") is rolled as written (damage, extra dice…).
function isTiro(terms, expr) {
    return /^\s*[+\-−]/.test(expr) && terms[0].value !== undefined;
}

function roll(expr, label) {
    const terms = parseRoll(expr);
    if (!terms) { flash(`No se puede tirar "${expr}"`); return; }
    const tiro = isTiro(terms, expr);
    if (tiro) terms.unshift({ sign: 1, count: 1, sides: 20 });
    const { total, breakdown } = evaluate(terms);
    const crit = tiro && /die-max">20</.test(breakdown);
    addLog({ label, expr: expr.replace(/[()]/g, ''), breakdown, total, crit });
    sendDiscord(label, expr, breakdown, total);
}

// ── Log ──────────────────────────────────────────────────────────────────────

function addLog({ label, expr, breakdown, total, crit }) {
    const log = document.getElementById('dice-log');
    document.getElementById('log-empty')?.remove();
    const el = document.createElement('div');
    el.className = 'log-entry fresh' + (crit ? ' crit' : '');
    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.innerHTML = `
        <div class="log-head">
            <span class="log-label">${escapeHtml(label || 'Tirada')}${crit ? ' <span class="log-crit">¡Crítico!</span>' : ''}</span>
            <span class="log-time">${time}</span>
        </div>
        <div class="log-body">
            <span class="log-breakdown">${breakdown}</span>
            <span class="log-total">${total}</span>
        </div>
        <button class="log-reroll" title="Repetir">↻</button>`;
    el.querySelector('.log-reroll').addEventListener('click', () => roll(expr, label));
    log.prepend(el);
    setTimeout(() => el.classList.remove('fresh'), 600);
    while (log.children.length > 60) log.lastElementChild.remove();
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function flash(msg) {
    const el = document.getElementById('dice-flash');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => el.classList.remove('show'), 2200);
}

// Optional Discord webhook, same parameters as the old roller: ?hook=<id/token>&name=<who>
function sendDiscord(label, expr, breakdown, total) {
    const params = new URLSearchParams(location.search);
    const hook = params.get('hook');
    if (!hook) return;
    const who = params.get('name') || 'Alguien';
    const plain = breakdown.replace(/<span class="die-faces">(.*?)<\/span>/g, (_, f) => ' [' + f.replace(/<[^>]+>/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '') + ']').replace(/<[^>]+>/g, '');
    fetch('https://discord.com/api/webhooks/' + hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [{ title: `${who} ha tirado${label ? ': ' + label : ''}`, description: plain, fields: [{ name: 'Resultado', value: String(total), inline: true }] }] })
    }).catch(() => { });
}

// ── Pool builder ─────────────────────────────────────────────────────────────

function poolExpr() {
    const parts = [];
    for (const d of DICE) {
        const n = pool[d.sides] || 0;
        if (!n) continue;
        parts.push(d.sides < 0 ? `-${n}d${-d.sides}` : `+${n}d${d.sides}`);
    }
    if (poolMod) parts.push(poolMod > 0 ? `+${poolMod}` : `${poolMod}`);
    return parts.join('').replace(/^\+/, '');
}

function renderPool() {
    const el = document.getElementById('dice-pool');
    const expr = poolExpr();
    el.innerHTML = expr
        ? DICE.filter(d => pool[d.sides]).map(d =>
            `<button class="pool-chip" data-sides="${d.sides}" title="Quitar">${d.sides < 0 ? '−' : ''}${pool[d.sides]}d${Math.abs(d.sides)} ×</button>`).join('')
          + (poolMod ? `<span class="pool-mod">${poolMod > 0 ? '+' : ''}${poolMod}</span>` : '')
        : '<span class="pool-empty">Pulsa un dado para añadirlo</span>';
    document.getElementById('mod-value').textContent = (poolMod > 0 ? '+' : '') + poolMod;
    document.getElementById('roll-pool').disabled = !expr;
}

function initDice() {
    const grid = document.getElementById('dice-grid');
    grid.innerHTML = DICE.map(d => `
        <button class="die-btn" data-sides="${d.sides}" title="${d.title || 'd' + d.sides}">
            <img src="${d.img}" alt="">
            <span>${d.sides < 0 ? '−d6' : 'd' + d.sides}</span>
        </button>`).join('');
    grid.addEventListener('click', e => {
        const b = e.target.closest('.die-btn'); if (!b) return;
        const s = +b.dataset.sides; pool[s] = (pool[s] || 0) + 1; renderPool();
    });
    document.getElementById('dice-pool').addEventListener('click', e => {
        const c = e.target.closest('.pool-chip'); if (!c) return;
        const s = +c.dataset.sides; pool[s]--; if (pool[s] <= 0) delete pool[s]; renderPool();
    });
    document.getElementById('mod-minus').onclick = () => { poolMod--; renderPool(); };
    document.getElementById('mod-plus').onclick = () => { poolMod++; renderPool(); };
    document.getElementById('roll-pool').onclick = () => { const x = poolExpr(); if (x) roll(x, 'Reserva'); };
    document.getElementById('clear-pool').onclick = () => { for (const k in pool) delete pool[k]; poolMod = 0; renderPool(); };
    document.getElementById('expr-form').addEventListener('submit', e => {
        e.preventDefault();
        const inp = document.getElementById('expr-input');
        if (inp.value.trim()) roll(inp.value.trim(), 'Expresión');
    });
    document.getElementById('clear-log').onclick = () => {
        document.getElementById('dice-log').innerHTML = '<div id="log-empty" class="log-empty">Sin tiradas todavía. Pulsa cualquier valor subrayado de la ficha para tirarlo.</div>';
    };
    renderPool();
}

// ── Click-to-roll on the stat block ─────────────────────────────────────────

// Best-effort label: data-label, else the nearest preceding bold name (ability name)
function labelFor(el) {
    if (el.dataset.label) return el.dataset.label;
    let n = el;
    if (n.parentElement && /^(B|STRONG)$/.test(n.parentElement.tagName)) n = n.parentElement;
    for (let depth = 0; n && depth < 4; depth++) {
        let p = n.previousSibling;
        while (p) {
            if (p.nodeType === 1 && /^(B|STRONG)$/.test(p.tagName)) {
                const t = p.textContent.trim();
                if (t && !/^[+\-−]?\d/.test(t)) return t.replace(/[:.]$/, '');
            }
            p = p.previousSibling;
        }
        n = n.parentElement;
        if (n && n.classList && n.classList.contains('mesa-sheet')) break;
    }
    return 'Tirada';
}

function initSheetRolls() {
    document.getElementById('sheet').addEventListener('click', e => {
        const r = e.target.closest('.rollable');
        if (!r) return;
        e.preventDefault();
        roll(r.dataset.roll, labelFor(r));
    });
}

// ── Stat block loading ───────────────────────────────────────────────────────

function vm() { return document.getElementById('app').__vue__; }

let currentMode = null;   // 'vue' (character) | 'md' (markdown sheet)

function show(mode, title) {
    currentMode = mode;
    document.getElementById('empty-state').hidden = true;
    document.getElementById('vue-sheet').hidden = mode !== 'vue';
    document.getElementById('md-sheet').hidden = mode !== 'md';
    document.getElementById('sheet-name').textContent = title || '';
    document.getElementById('sheet').scrollTop = 0;
}

function loadCharacterObject(obj, title) {
    const v = vm();
    v.activeToggles = [];
    v.loadCharacter(obj);
    show('vue', title || obj.name);
}

// "**Umbrales de Daño**: 4 (General) | 8 (Físico)" → same big pills as the character stat block
function umbralPills(html) {
    return html.replace(/<strong>Umbrales de Da[ñn]o:?<\/strong>:?\s*([^\n<]+)\n?/i, (whole, list) => {
        const items = [...list.matchAll(/([\d+\-\[\]]+)\s*\(([^)]+)\)/g)];
        if (!items.length) return whole;
        const pills = items.map(([, v, c]) => {
            const general = /general/i.test(c);
            return `<span class="sb-umbral${general ? ' sb-umbral-general' : ''}"><span class="sb-umbral-value">${v}</span><span class="sb-umbral-cat">${c.trim()}</span></span>`;
        }).join('');
        return `<span class="sb-block md-umbrales"><span class="sb-block-label">Umbrales de Daño</span><span class="sb-umbrales">${pills}</span></span>`;
    });
}

function loadMarkdown(text, title) {
    const html = umbralPills(marked.parse(text));
    document.getElementById('md-sheet').innerHTML = markRollables(html);
    show('md', title);
}

function loadFromCreador() {
    let obj = null;
    try { obj = JSON.parse(localStorage.getItem('currentCharacter')); } catch (e) { }
    if (!obj) { flash('No hay ningún personaje guardado en el Creador'); return; }
    loadCharacterObject(obj, (obj.name || 'Personaje') + ' · Creador');
}

// Opens the Creador with the character on screen (a loaded .json / Creador character).
// For a .md sheet or an empty Mesa it just opens the Creador with its own character.
function backToCreador() {
    if (currentMode === 'vue') {
        try { localStorage.setItem('currentCharacter', JSON.stringify(vm().characterData())); } catch (e) { }
    }
    location.href = '/creador.html';
}

function loadFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
        const text = reader.result;
        if (/\.json$/i.test(file.name)) {
            try { loadCharacterObject(JSON.parse(text), file.name); }
            catch (e) { flash('JSON no válido'); }
        } else {
            loadMarkdown(text, file.name);
        }
    };
    reader.readAsText(file);
}

function initLoaders() {
    document.getElementById('back-creador').onclick = backToCreador;
    document.getElementById('file-input').addEventListener('change', e => {
        if (e.target.files[0]) loadFile(e.target.files[0]);
        e.target.value = '';
    });

    // Drag & drop a .json / .md onto the sheet area
    const sheet = document.getElementById('sheet');
    sheet.addEventListener('dragover', e => { e.preventDefault(); sheet.classList.add('drag'); });
    sheet.addEventListener('dragleave', () => sheet.classList.remove('drag'));
    sheet.addEventListener('drop', e => {
        e.preventDefault(); sheet.classList.remove('drag');
        if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });

    if (new URLSearchParams(location.search).get('load') === 'creador') {
        // main.js loads its data asynchronously; the character itself is ready immediately
        loadFromCreador();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDice();
    initSheetRolls();
    initLoaders();
});
