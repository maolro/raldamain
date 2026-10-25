/* i18n.js — Spanish → English for the website, without a duplicated /en site.
 *
 * The ES / EN switch (navbar, or a page's [data-lang-slot]) is remembered in
 * this browser. In English:
 *   - the Creador, the Mesa, the rank list and the rank pages are translated:
 *     interface words and game terms through a fixed glossary (consistent
 *     terminology), longer text through the browser's own on-device translator
 *     (Chrome / Edge "Translator" API), cached in localStorage;
 *   - every other page keeps its Spanish text and shows an "in progress" note.
 * Only what is on screen changes (text nodes and a few attributes); the
 * character data the Creador saves is never touched. Elements marked
 * translate="no" or .notranslate are skipped.
 */
(function () {
    const KEY = 'raldamain.lang';
    const CACHE_KEY = 'raldamain.tr.es-en.v2';
    const lang = () => { try { return localStorage.getItem(KEY) || 'es'; } catch (e) { return 'es'; } };
    const path = location.pathname;
    const SUPPORTED = /^\/(creador|mesa|rangos|rango\/|templates\/view-rango)/.test(path)
        || /\/(creador|mesa|rangos|index)(\.html)?$/.test(path) || path === '/';

    // ── Glossary ──────────────────────────────────────────────────────────
    // Whole labels the translator gets wrong or that must match the rules' terms
    const EXACT = {
        'Reglas Principales': 'Core Rules', 'Rangos': 'Ranks', 'Criaturas': 'Creatures', 'Equipamiento': 'Equipment',
        'El Mundo': 'The World', 'Creador de Personajes': 'Character Builder', 'ESTADÍSTICAS': 'STATS', 'TALENTOS': 'TALENTS',
        'RANGOS': 'RANKS', 'HECHIZOS': 'SPELLS', 'EQUIPAMIENTO': 'EQUIPMENT', 'Descargar': 'Download', 'Cargar': 'Load',
        'Nueva ficha': 'New sheet', 'Nivel:': 'Level:', 'Raza:': 'Race:', 'Puntos a distribuir:': 'Points to spend:',
        'Nombre': 'Name', 'Impactos': 'Hits', 'Chi': 'Chi', 'Crd': 'San', 'Inic.': 'Init.', 'Umbrales de Daño': 'Damage Thresholds',
        'Tiros de Salvación': 'Saving Throws', 'Velocidad': 'Speed', 'Pasivas': 'Passives', 'Acciones': 'Actions',
        'Reacciones': 'Reactions', 'General': 'General', 'Físico': 'Physical', 'Magia': 'Magic', 'Mágico': 'Magic',
        'Copiar ficha (Markdown)': 'Copy sheet (Markdown)', '🎲 Mesa de Pruebas': '🎲 Test Table', 'Mesa de Pruebas': 'Test Table',
        'Reglas Fundamentales': 'Core Rules', 'Descripción': 'Description', 'Coste:': 'Cost:', 'Alcance:': 'Range:',
        'Área:': 'Area:', 'Daño:': 'Damage:', 'Duración:': 'Duration:', 'Impactos:': 'Hits:', 'Talentos:': 'Talents:',
        'Solo con:': 'Only with:', 'Hechizos:': 'Spells:', 'Estado de combate': 'Combat state', 'Estados de combate': 'Combat states',
        'En construcción': 'In progress', '🚧 En construcción': '🚧 In progress', 'Volver a los Rangos': 'Back to Ranks',
        'Rangos gratuitos:': 'Free ranks:', 'Rangos a distribuir:': 'Ranks to spend:', 'Rango': 'Rank',
        'Buscar información aquí...': 'Search here...', 'Todas': 'All', 'Todos': 'All',
        'Estadísticas': 'Stats', 'Talentos': 'Talents', 'Hechizos': 'Spells', 'Paso': 'Step',
        // stat and save abbreviations
        'FUE': 'STR', 'DES': 'DEX', 'CON': 'CON', 'INT': 'INT', 'SAB': 'WIS', 'CAR': 'CHA', 'FÍS': 'PHY', 'VOL': 'WIL', 'MEN': 'MEN',
        // rank categories
        'Ascendencias': 'Ancestries', 'Ascendencia': 'Ancestry', 'Elementalismo': 'Elementalism', 'Ocultismo': 'Occultism',
        'Ciencia': 'Science', 'Religión': 'Religion', 'Marcial': 'Martial', 'Combate': 'Combat', 'Arcana': 'Arcana',
        'Arcanos': 'Arcane', 'Elementalismos': 'Elementalism', 'Marciales': 'Martial', 'Ocultismos': 'Occultism',
        'Divinos': 'Divine', 'Científicos': 'Science', 'Ver Habilidades →': 'See abilities →',
        // stats in full
        'Fuerza': 'Strength', 'Destreza': 'Dexterity', 'Constitución': 'Constitution', 'Inteligencia': 'Intelligence',
        'Sabiduría': 'Wisdom', 'Carisma': 'Charisma',
        // rank level titles
        'Iniciado': 'Initiate', 'Adepto': 'Adept', 'Profesional': 'Professional', 'Experto': 'Expert', 'Maestro': 'Master',
        'Ascendido': 'Ascended', 'Leyenda': 'Legend',
    };
    // case-insensitive lookup; the first (mixed-case) spelling wins, and the result
    // follows the original's case (a heading in capitals stays in capitals)
    const EXACT_LC = {};
    for (const [k, v] of Object.entries(EXACT)) if (!(k.toLowerCase() in EXACT_LC)) EXACT_LC[k.toLowerCase()] = v;
    const lookup = text => {
        // fixed labels, and names the glossary covers whole ("Ira", "Estilo Coloso")
        const v = EXACT_LC[text.toLowerCase()] || TERM_LC[text.toLowerCase()];
        if (!v) return null;
        return /\p{L}/u.test(text) && text === text.toUpperCase() && text !== text.toLowerCase() ? v.toUpperCase() : v;
    };
    // Game terms swapped for their English rules terms before machine translation,
    // so every description uses the same words (longest first)
    const TERMS = [
        ['tiros de salvación', 'saving throws'], ['tiro de salvación', 'saving throw'], ['tiros defensivos', 'defense rolls'],
        ['tiro defensivo', 'defense roll'], ['umbrales de daño', 'damage thresholds'], ['Mente Desencadenada', 'Unleashed Mind'],
        ['Furia Abisal', 'Abyssal Fury'], ['Forma de la Bestia', 'Beast Form'], ['Armas de Fuego', 'Firearms'],
        ['Arma de Fuego', 'Firearm'], ['acción bonus', 'bonus action'], ['estado de combate', 'combat state'],
        ['Impactos', 'Hits'], ['Impacto', 'Hit'], ['Umbrales', 'Thresholds'], ['Umbral', 'Threshold'],
        ['Desventaja', 'Disadvantage'], ['Ventaja', 'Advantage'], ['Rangos', 'Ranks'], ['Rango', 'Rank'],
        ['Aperturas', 'Openings'], ['Apertura', 'Opening'], ['Empoderar', 'Empower'], ['Parada', 'Parry'],
        ['Esquiva', 'Dodge'], ['Cordura', 'Sanity'], ['Vitalidad', 'Vitality'], ['Iniciativa', 'Initiative'],
        ['Ira', 'Rage'], ['Recarga', 'Reload'],
        // rank names (machine translation would lower-case or literalise them)
        ['Estilo Coloso', 'Colossus Style'], ['Estilo Duelista', 'Duelist Style'], ['Estilo Asesino', 'Assassin Style'],
        ['Ascendencia Abisal', 'Abyssal Ancestry'], ['Ascendencia Celestial', 'Celestial Ancestry'],
        ['Ascendencia Primigenia', 'Primal Ancestry'], ['Ascendencia Infernal', 'Infernal Ancestry'],
        ['Ascendencia Akhásica', 'Akashic Ancestry'], ['Ascendencia Dracónica', 'Draconic Ancestry'],
        ['Guerrero Divino', 'Divine Warrior'], ['Magia Divina', 'Divine Magic'], ['Compañero Jurado', 'Sworn Companion'],
        ['Reflejos', 'Reflexes'], ['Fortitud', 'Fortitude'], ['Presencia', 'Presence'], ['Rastrear', 'Tracking'],
        ['Defensiva', 'Defensive'], ['Defensivo', 'Defensive'],
        ['Fuerza o Destreza', 'Strength or Dexterity'], ['Estadística principal', 'Main stat'], ['Reserva de Chi', 'Chi pool'],
        ['Parada Mágica', 'Magic Parry'], ['Parada de Arma', 'Weapon Parry'], ['paradas', 'parries'],
        // ability tags
        ['Mejora', 'Upgrade'], ['Pasiva', 'Passive'], ['Reacción', 'Reaction'], ['Innata', 'Innate'],
        ['Maniobra', 'Maneuver'], ['Duradera', 'Lasting'], ['Duelo', 'Duel'],
        ['Destreza', 'Dexterity'], ['Sabiduría', 'Wisdom'], ['Carisma', 'Charisma'],
    ];
    // English keeps the Spanish text's capitals: a capitalised start, and title case
    // for names ("Truco de Combate" → "Combat Trick", not "combat trick")
    const SMALL = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'to', 'for', 'with', 'by', 'at', 'from', 'vs']);
    const SMALL_ES = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'a', 'al', 'con', 'por']);
    function matchCase(es, en) {
        if (!en) return en;
        // the translator sometimes answers in capitals ("RAGE"): follow the original instead
        if (en === en.toUpperCase() && es !== es.toUpperCase()) en = en.toLowerCase();
        const words = es.split(/\s+/).filter(w => /\p{L}/u.test(w));
        const isTitle = words.length >= 2 && words.length <= 6 && !/[.:;]/.test(es)
            && words.every(w => SMALL_ES.has(w.toLowerCase()) || /^\p{Lu}/u.test(w));
        if (isTitle) en = en.replace(/\p{L}+/gu, (w, i) => (i > 0 && SMALL.has(w.toLowerCase())) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1));
        if (/^\P{L}*\p{Lu}/u.test(es)) en = en.replace(/\p{L}/u, c => c.toUpperCase());
        return en;
    }
    // Stat abbreviations (upper-case tokens only)
    const STATS = { 'FUE': 'STR', 'DES': 'DEX', 'SAB': 'WIS', 'CAR': 'CHA', 'FÍS': 'PHY', 'FIS': 'PHY', 'VOL': 'WIL' };

    TERMS.sort((x, y) => y[0].length - x[0].length);  // longer phrases before the words inside them
    const TERM_LC = {};
    for (const [es, en] of TERMS) TERM_LC[es.toLowerCase()] = en[0].toUpperCase() + en.slice(1);
    const termRx = TERMS.map(([es, en]) => [new RegExp(`(^|[^\\p{L}])${es}(?=[^\\p{L}]|$)`, 'giu'), en]);
    const statRx = new RegExp(`(^|[^\\p{L}])(${Object.keys(STATS).join('|')})(?=[^\\p{L}]|$)`, 'gu');
    function glossary(text) {
        let t = text.replace(statRx, (m, pre, ab) => pre + STATS[ab]);
        for (const [rx, en] of termRx) {
            t = t.replace(rx, (m, pre) => {
                const word = m.slice(pre.length);
                const out = word[0] === word[0].toUpperCase() ? en[0].toUpperCase() + en.slice(1) : en;
                return pre + out;
            });
        }
        return t;
    }

    // ── Switch ────────────────────────────────────────────────────────────
    function mountSwitch(host) {
        if (!host || host.querySelector('.lang-switch')) return;
        const box = document.createElement('div');
        box.className = 'lang-switch';
        box.setAttribute('translate', 'no');
        box.innerHTML = `<button type="button" data-l="es" title="Español">ES</button><button type="button" data-l="en" title="English">EN</button>`;
        box.querySelector(`[data-l="${lang()}"]`).classList.add('on');
        box.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (b) choose(b.dataset.l, b);
        });
        host.appendChild(box);
    }
    async function choose(l, btn) {
        if (l === lang()) return;
        if (l === 'en' && 'Translator' in self) {
            // the first use downloads the language model, which needs this click
            try {
                const old = btn.textContent;
                btn.textContent = '…';
                await Translator.create({
                    sourceLanguage: 'es', targetLanguage: 'en',
                    monitor(m) { m.addEventListener('downloadprogress', e => { btn.textContent = Math.round(e.loaded * 100) + '%'; }); },
                });
                btn.textContent = old;
            } catch (e) { /* falls back to the glossary only */ }
        }
        try { localStorage.setItem(KEY, l); } catch (e) {}
        location.reload();
    }

    // ── Translation ───────────────────────────────────────────────────────
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) {}
    let saveTimer = null;
    const remember = (k, v) => {
        cache[k] = v;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { cache = {}; } }, 800);
    };
    const done = new WeakMap();   // text node → the English we wrote (to skip our own changes)
    let translator = null;
    const queue = new Map();       // spanish text → [nodes]
    let busy = false;

    const SKIP = 'script,style,textarea,input,code,pre,[translate="no"],.notranslate';
    const hasWords = s => /\p{L}{2,}/u.test(s);

    function setText(node, spanish, english) {
        const lead = node.data.match(/^\s*/)[0], trail = node.data.match(/\s*$/)[0];
        const out = lead + english + trail;
        done.set(node, out);
        if (node.data !== out) node.data = out;
    }
    function translateNode(node) {
        if (done.get(node) === node.data) return;
        const raw = node.data, text = raw.trim();
        if (!text || !hasWords(text)) return;
        const p = node.parentElement;
        if (!p || p.closest(SKIP)) return;
        const exact = lookup(text);
        if (exact) return setText(node, text, exact);
        // "Acciones (3)", "FÍS +0": a known label followed by numbers
        const m = text.match(/^([^\d(+·]*\p{L})\s*([(+·\d].*)$/u);
        if (m && lookup(m[1].trim())) return setText(node, text, lookup(m[1].trim()) + ' ' + m[2]);
        if (cache[text]) return setText(node, text, cache[text]);
        const pre = glossary(text);
        // nothing left to translate once the glossary is applied (abbreviations like STR, numbers)
        if (!translator || !/\p{L}{4,}/u.test(pre)) { if (pre !== text) setText(node, text, pre); return; }
        if (!queue.has(text)) queue.set(text, []);
        queue.get(text).push(node);
        pump();
    }
    async function pump() {
        if (busy || !translator) return;
        busy = true;
        while (queue.size) {
            const [text, nodes] = queue.entries().next().value;
            queue.delete(text);
            let en = text;
            try { en = await translator.translate(glossary(text)); } catch (e) { en = glossary(text); }
            en = matchCase(text, en);
            remember(text, en);
            for (const n of nodes) if (n.isConnected && n.data.trim() === text) setText(n, text, en);
        }
        busy = false;
    }
    function translateAttrs(el) {
        for (const a of ['placeholder', 'title']) {
            const v = el.getAttribute && el.getAttribute(a);
            if (v && lookup(v.trim())) el.setAttribute(a, lookup(v.trim()));
        }
    }
    function walk(root) {
        if (root.nodeType === 3) return translateNode(root);
        if (root.nodeType !== 1 || root.closest?.(SKIP)) return;
        translateAttrs(root);
        root.querySelectorAll('[placeholder],[title]').forEach(translateAttrs);
        const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = it.nextNode())) translateNode(n);
    }
    function observe() {
        new MutationObserver(muts => {
            for (const m of muts) {
                if (m.type === 'characterData') translateNode(m.target);
                else m.addedNodes.forEach(walk);
            }
        }).observe(document.body, { subtree: true, childList: true, characterData: true });
    }

    function banner(html) {
        const b = document.createElement('div');
        b.className = 'lang-banner';
        b.setAttribute('translate', 'no');
        b.innerHTML = html;
        document.body.prepend(b);
    }

    // For components that show a name inside an input (the Creador's pickers)
    let readyResolve;
    const ready = new Promise(r => { readyResolve = r; });
    async function tr(text) {
        if (lang() !== 'en' || !text) return text;
        await ready;
        const t = String(text).trim();
        const ex = lookup(t);
        if (ex) return ex;
        if (cache[t]) return cache[t];
        const pre = glossary(t);
        if (!translator || !/\p{L}{4,}/u.test(pre)) return pre;
        let en;
        try { en = await translator.translate(pre); } catch (e) { en = pre; }
        en = matchCase(t, en);
        remember(t, en);
        return en;
    }
    function trSync(text) {
        if (lang() !== 'en' || !text) return null;
        const t = String(text).trim();
        return lookup(t) || cache[t] || null;
    }

    async function start() {
        document.documentElement.lang = 'en';
        if (!SUPPORTED) {
            readyResolve();
            banner(`🚧 This section is still in Spanish. The <a href="/creador">Character Builder</a> and the <a href="/rangos">Ranks</a> are available in English. <button type="button" data-back>Ver en español</button>`);
            document.querySelector('[data-back]').addEventListener('click', () => choose('es'));
            // menus still read in English
            document.querySelectorAll('.navbar').forEach(walk);
            new MutationObserver(() => document.querySelectorAll('.navbar').forEach(walk)).observe(document.body, { childList: true, subtree: true });
            return;
        }
        let availability = 'unavailable';
        if ('Translator' in self) {
            try {
                availability = await Translator.availability({ sourceLanguage: 'es', targetLanguage: 'en' });
                if (availability === 'available')
                    translator = await Translator.create({ sourceLanguage: 'es', targetLanguage: 'en' });
            } catch (e) { translator = null; }
        }
        if (!translator && (availability === 'downloadable' || availability === 'downloading')) {
            // supported browser, model not on this device yet: the download needs a click
            banner(`Only the interface is in English until the translator is downloaded to this browser (once, about a minute). <button type="button" data-dl>Download translator</button> <button type="button" data-back>Ver en español</button>`);
            document.querySelector('[data-back]').addEventListener('click', () => choose('es'));
            document.querySelector('[data-dl]').addEventListener('click', async e => {
                const b = e.target;
                try {
                    b.textContent = '…';
                    await Translator.create({ sourceLanguage: 'es', targetLanguage: 'en',
                        monitor(m) { m.addEventListener('downloadprogress', ev => { b.textContent = Math.round(ev.loaded * 100) + '%'; }); } });
                    location.reload();
                } catch (err) { b.textContent = 'Not available'; }
            });
        } else if (!translator) {
            banner(`Your browser can't translate the descriptions automatically, so only the interface is in English. Use your browser's "Translate page" for the rest, or open the site in Chrome or Edge. <button type="button" data-back>Ver en español</button>`);
            document.querySelector('[data-back]').addEventListener('click', () => choose('es'));
        }
        readyResolve();
        walk(document.body);
        observe();
    }

    window.RaldamainLang = { lang, choose, mountSwitch, tr, trSync };
    const boot = () => {
        document.querySelectorAll('[data-lang-slot]').forEach(mountSwitch);
        if (lang() === 'en') start();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
