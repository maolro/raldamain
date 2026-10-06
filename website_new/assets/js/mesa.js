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
let poolLabel = '';       // ability loaded from the sheet ("Gran Hacha"), used as the roll's label

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
    const crit = /\d*d20<span class="die-faces">(?:(?!<\/span><\/span>).)*die-max">20</.test(breakdown);
    const sent = sendDiscord(label, breakdown, total, crit);
    addLog({ label, expr: expr.replace(/[()]/g, ''), breakdown, total, crit, sent });
}

// ── Log ──────────────────────────────────────────────────────────────────────

function addLog({ label, expr, breakdown, total, crit, sent }) {
    const log = document.getElementById('dice-log');
    document.getElementById('log-empty')?.remove();
    const el = document.createElement('div');
    el.className = 'log-entry fresh' + (crit ? ' crit' : '');
    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.innerHTML = `
        <div class="log-head">
            <span class="log-label">${escapeHtml(label || 'Tirada')}${crit ? ' <span class="log-crit">¡Crítico!</span>' : ''}</span>
            <span class="log-time">${sent ? '<span class="log-sent" title="Enviada a Discord">🔗</span> ' : ''}${time}</span>
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

function flash(msg, type) {
    const el = document.getElementById('dice-flash');
    el.textContent = msg;
    el.classList.toggle('ok', type === 'ok');
    el.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => el.classList.remove('show'), 2600);
}

// ── Discord link ─────────────────────────────────────────────────────────────
// { name, hook } saved in this browser. With saved data the link starts on; without, off.
const DISCORD_KEY = 'mesaDiscord';
const HOOK_RE = /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
const discord = { config: null, on: false };

// Accepts a full webhook URL or the old "id/token" form
function normalizeHook(v) {
    v = String(v || '').trim();
    if (/^\d+\/[\w-]+$/.test(v)) v = 'https://discord.com/api/webhooks/' + v;
    return v.replace(/\/+$/, '');
}

function saveDiscord(config) {
    discord.config = config;
    try {
        if (config) localStorage.setItem(DISCORD_KEY, JSON.stringify(config));
        else localStorage.removeItem(DISCORD_KEY);
    } catch (e) { }
}

function loadDiscord() {
    try { discord.config = JSON.parse(localStorage.getItem(DISCORD_KEY)); } catch (e) { discord.config = null; }
    // One-time import of the old ?hook=…&name=… links, then clean the address bar
    const params = new URLSearchParams(location.search);
    if (params.get('hook')) {
        saveDiscord({ name: params.get('name') || '', hook: normalizeHook(params.get('hook')) });
        params.delete('hook'); params.delete('name');
        const q = params.toString();
        history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
    }
    discord.on = !!(discord.config && discord.config.hook);
    renderDiscordBtn();
}

function renderDiscordBtn() {
    const btn = document.getElementById('discord-btn');
    btn.classList.toggle('on', discord.on);
    btn.textContent = discord.on ? '🔗 Discord: ON' : '🔗 Discord: OFF';
    btn.title = discord.on
        ? `Las tiradas se envían a Discord como «${discord.config.name || 'Alguien'}». Pulsa para desactivar.`
        : (discord.config ? 'Pulsa para enviar las tiradas a Discord' : 'Pulsa para conectar un canal de Discord');
    document.getElementById('discord-cfg').hidden = !discord.config;
}

function openDiscordDialog() {
    const dlg = document.getElementById('discord-dialog');
    document.getElementById('dc-name').value = discord.config ? discord.config.name || '' : '';
    document.getElementById('dc-hook').value = discord.config ? discord.config.hook || '' : '';
    document.getElementById('dc-error').textContent = '';
    document.getElementById('dc-forget').hidden = !discord.config;
    dlg.showModal();
    document.getElementById('dc-name').focus();
}

// Reads and validates the dialog; returns { name, hook } or null (and shows why)
function dialogConfig() {
    const name = document.getElementById('dc-name').value.trim();
    const hook = normalizeHook(document.getElementById('dc-hook').value);
    const err = document.getElementById('dc-error');
    if (!name) { err.textContent = 'Escribe tu nombre.'; return null; }
    if (!HOOK_RE.test(hook)) { err.textContent = 'El webhook debe ser una URL como https://discord.com/api/webhooks/…'; return null; }
    err.textContent = '';
    return { name, hook };
}

async function postToDiscord(config, embed) {
    const r = await fetch(config.hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: config.name, embeds: [embed] }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
}

function initDiscord() {
    document.getElementById('discord-btn').onclick = () => {
        if (discord.on) { discord.on = false; renderDiscordBtn(); return; }
        if (!discord.config) { openDiscordDialog(); return; }
        discord.on = true; renderDiscordBtn();
    };
    document.getElementById('discord-cfg').onclick = openDiscordDialog;
    document.getElementById('dc-cancel').onclick = () => document.getElementById('discord-dialog').close();
    document.getElementById('dc-save').onclick = (e) => {
        e.preventDefault();
        const cfg = dialogConfig(); if (!cfg) return;
        saveDiscord(cfg); discord.on = true; renderDiscordBtn();
        document.getElementById('discord-dialog').close();
        flash('Discord conectado: las tiradas se enviarán al canal', 'ok');
    };
    document.getElementById('dc-test').onclick = async (e) => {
        e.preventDefault();
        const cfg = dialogConfig(); if (!cfg) return;
        const err = document.getElementById('dc-error');
        err.textContent = 'Enviando…';
        try {
            await postToDiscord(cfg, { title: `${cfg.name} se ha conectado a la Mesa de Pruebas`, color: 0xFFF200 });
            err.textContent = '✓ Mensaje de prueba enviado.';
        } catch (x) { err.textContent = 'No se pudo enviar (' + x.message + '). Revisa el webhook.'; }
    };
    document.getElementById('dc-forget').onclick = (e) => {
        e.preventDefault();
        if (!confirm('¿Olvidar el nombre y el webhook guardados en este navegador?')) return;
        saveDiscord(null); discord.on = false; renderDiscordBtn();
        document.getElementById('discord-dialog').close();
    };
    loadDiscord();
}

// Sends a roll to the channel when the link is on; returns whether it was sent
function sendDiscord(label, breakdown, total, crit) {
    if (!discord.on || !discord.config) return false;
    const plain = breakdown
        .replace(/<span class="die-faces">(.*?)<\/span>/g, (_, f) =>
            ' [' + f.replace(/<[^>]+>/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '') + ']')
        .replace(/<[^>]+>/g, '');
    postToDiscord(discord.config, {
        title: `${discord.config.name} — ${label || 'Tirada'}${crit ? ' · ¡Crítico!' : ''}`,
        description: `${plain}\n**Total: ${total}**`,
        color: crit ? 0xE74C3C : 0xFFF200,
    }).catch(() => flash('No se pudo enviar la tirada a Discord. Revisa el webhook (⚙).'));
    return true;
}

// ── Pool builder ─────────────────────────────────────────────────────────────

function poolExpr() {
    const parts = [];
    // d20 first ("1d20+1d6+4"), then the other dice in button order
    const order = [...DICE].sort((x, y) => (y.sides === 20) - (x.sides === 20));
    for (const d of order) {
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
    const label = poolLabel ? `<span class="pool-label" title="Tirada cargada desde la ficha">${escapeHtml(poolLabel)}</span>` : '';
    el.classList.toggle('loaded', !!poolLabel);
    el.innerHTML = expr
        ? label + DICE.filter(d => pool[d.sides]).map(d =>
            `<button class="pool-chip" data-sides="${d.sides}" title="Quitar">${d.sides < 0 ? '−' : ''}${pool[d.sides]}d${Math.abs(d.sides)} ×</button>`).join('')
          + (poolMod ? `<span class="pool-mod">${poolMod > 0 ? '+' : ''}${poolMod}</span>` : '')
        : '<span class="pool-empty">Pulsa un dado para añadirlo</span>';
    document.getElementById('mod-value').textContent = (poolMod > 0 ? '+' : '') + poolMod;
    document.getElementById('roll-pool').disabled = !expr;
}

function clearPool() {
    for (const k in pool) delete pool[k];
    poolMod = 0; poolLabel = '';
    renderPool();
}

// Puts a sheet roll in the pool so it can be adjusted (extra dice, modifier, −d6) before "Tirar".
// "+5+1d6" (a tiro) → d20 + d6, modifier +5 · "2d8+4" (damage) → 2×d8, modifier +4
function loadIntoPool(expr, label) {
    const terms = parseRoll(expr);
    if (!terms) { flash(`No se puede tirar "${expr}"`); return; }
    if (isTiro(terms, expr)) terms.unshift({ sign: 1, count: 1, sides: 20 });
    const supported = new Set(DICE.map(d => d.sides));
    const fits = terms.every(t => t.value !== undefined || supported.has(t.sign < 0 ? -t.sides : t.sides));
    if (!fits) {
        // Dice the pool has no button for: leave it in the expression line instead
        const inp = document.getElementById('expr-input');
        inp.value = expr; inp.focus();
        flash(`${label}: ajusta la expresión y pulsa 🎲`, 'ok');
        return;
    }
    for (const k in pool) delete pool[k];
    poolMod = 0;
    for (const t of terms) {
        if (t.value !== undefined) poolMod += t.sign * t.value;
        else { const key = t.sign < 0 ? -t.sides : t.sides; pool[key] = (pool[key] || 0) + t.count; }
    }
    poolLabel = label || '';
    renderPool();
    const el = document.getElementById('dice-pool');
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    flash(`${poolLabel || 'Tirada'} cargada: añade dados, cambia el modificador o pulsa Tirar`, 'ok');
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
    document.getElementById('roll-pool').onclick = () => { const x = poolExpr(); if (x) roll(x, poolLabel || 'Reserva'); };
    document.getElementById('clear-pool').onclick = clearPool;
    document.getElementById('expr-form').addEventListener('submit', e => {
        e.preventDefault();
        const inp = document.getElementById('expr-input');
        if (inp.value.trim()) roll(inp.value.trim(), 'Expresión');
    });
    document.getElementById('clear-log').onclick = () => {
        document.getElementById('dice-log').innerHTML = '<div id="log-empty" class="log-empty">Sin tiradas todavía. Pulsa un valor subrayado de la ficha para cargarlo en la reserva.</div>';
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
        loadIntoPool(r.dataset.roll, labelFor(r));
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

    const fichaId = new URLSearchParams(location.search).get('ficha');
    if (fichaId) {
        // Served by the Taller de Raldamain: load data/statblocks/<id>.json
        fetch('/api/fichas/' + encodeURIComponent(fichaId), { cache: 'no-store' })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(obj => loadCharacterObject(obj, (obj.name || fichaId) + ' · Ficha'))
            .catch(() => flash('No se pudo cargar la ficha «' + fichaId + '» (¿abriste la Mesa desde el Taller?)'));
    }
    if (new URLSearchParams(location.search).get('load') === 'creador') {
        // main.js loads its data asynchronously; the character itself is ready immediately
        loadFromCreador();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDice();
    initDiscord();
    initSheetRolls();
    initLoaders();
});
