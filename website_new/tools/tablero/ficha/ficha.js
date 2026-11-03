// The sheet window of the Tablero (an iframe over the board).
//
// The board page sends the sheet:      { type: 'sheet', kind: 'pj' | 'criatura', data }
// and this page draws it with the website's own code: a character with the Creador's
// v-statblock (assets/js/builder/main.js computes it, as in the Mesa de Pruebas), a
// creature with the Bestiario's renderer (assets/js/creature_loader.js). It answers:
//   { type: 'ready' }                    loaded, waiting for a sheet
//   { type: 'stats', hits, chi, actions, reactions }   the sheet's Impactos and Chi (the token's bars),
//                                        and its actions and reactions per round
//   { type: 'roll', roll, label, kind, stats }   a value clicked: load it in the Dados tab
//                                        (kind: Ataque, Defensa, Salvación…; stats: FUE, DES…)
(function () {
    const post = msg => window.parent.postMessage(msg, location.origin);
    let tokenName = '';
    // a script that fails while drawing: said in the window, not only in the console
    const errors = [];
    window.addEventListener('error', e => errors.push(e.message));
    const fail = msg => {
        const w = document.getElementById('wait');
        w.hidden = false;
        w.textContent = 'No se pudo dibujar la ficha: ' + msg;
    };
    const VUE = 'https://cdn.jsdelivr.net/npm/vue@2.7.16/dist/vue.min.js';
    const SCRIPTS = {
        pj: [VUE, '/assets/js/builder/v-statblock.js', '/assets/js/richtext.js', '/assets/js/builder/main.js'],
        criatura: [VUE, '/assets/js/builder/v-statblock.js', '/assets/js/creature_loader.js'],
    };
    // creature_loader.js is added after the page loaded, so its own "load the creature
    // from the URL" start-up never runs (as in the Taller's creature builder)
    const CREATURE_MARKUP = `
      <div hidden><h1 id="creature-name"></h1><div id="hero-section"></div><div id="creature-meta"></div>
        <div id="creature-lore"><p id="lore-text"></p></div><div id="creature-loot"><span id="loot-xp-value"></span><table><tbody id="loot-items"></tbody></table></div>
        <div id="creature-tags"></div></div>
      <div class="statblock" id="statblock">
        <div class="statblock-header"><h2 id="statblock-name"></h2><p id="statblock-subtitle"></p></div>
        <div class="statblock-combat" id="statblock-combat"></div>
        <div class="statblock-separator"></div>
        <div class="statblock-abilities" id="statblock-abilities"></div>
        <div class="statblock-separator"></div>
        <div class="statblock-properties" id="statblock-properties"></div>
        <div class="statblock-separator" id="traits-separator"></div>
        <div class="statblock-traits" id="statblock-traits"></div>
        <div class="statblock-section"><h3 class="statblock-section-title">Acciones</h3><div class="statblock-section-content" id="statblock-actions"></div></div>
        <div class="statblock-section" id="reactions-section" style="display:none"><h3 class="statblock-section-title">Reacciones</h3><div class="statblock-section-content" id="statblock-reactions"></div></div>
        <div class="statblock-section" id="legendary-section" style="display:none"><h3 class="statblock-section-title">Acciones Legendarias</h3><p class="legendary-intro" id="legendary-intro"></p><div class="statblock-section-content" id="statblock-legendary"></div></div>
      </div>`;

    const loadScript = src => new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error('no se pudo cargar ' + src));
        document.body.appendChild(s);
    });

    let shown = false, sheetKind = '';
    // the token's name, shown as the stat block's (it changes when the token is renamed)
    function showName(name) {
        if (!name) return;
        if (sheetKind === 'criatura') {
            const h = document.getElementById('statblock-name');
            if (h) h.textContent = name;
        } else {
            const app = document.getElementById('app'), vm = app && app.__vue__;
            if (vm) vm.charactername = name;
        }
    }
    window.addEventListener('message', async e => {
        if (e.origin !== location.origin || !e.data) return;
        if (e.data.type === 'name') { showName(String(e.data.name || '')); return; }
        if (e.data.type !== 'sheet' || shown) return;
        shown = true;
        const { kind, data } = e.data;
        sheetKind = kind;
        tokenName = String(e.data.name || '');
        try {
            // (main.js mounts the Creador on #app as soon as it loads: the markup goes first)
            if (kind !== 'criatura') document.getElementById('sheet').innerHTML = '<div id="app"><v-statblock rollable></v-statblock></div>';
            for (const src of SCRIPTS[kind] || SCRIPTS.pj) await loadScript(src);
            if (kind === 'criatura') showCreature(data); else showCharacter(data);
            if (kind === 'criatura') showName(tokenName);
            document.getElementById('wait').hidden = true;
        } catch (err) {
            fail(err.message);
        }
    });

    // ── creature: the Bestiario's stat block, with its dice made clickable ──
    function showCreature(data) {
        const el = document.getElementById('sheet');
        el.innerHTML = CREATURE_MARKUP;
        renderCreaturePage(JSON.parse(JSON.stringify(data)));
        const sb = document.getElementById('statblock');
        sb.classList.add('sb-rollable');
        sb.innerHTML = markRollables(sb.innerHTML, true);
        const combat = data.combat || {};
        post({ type: 'stats', hits: Number(data.hits) || 0, chi: Number(data.chi) || 0,
            actions: Number(combat.acciones) || 0, reactions: Number(combat.reacciones) || 0 });
    }

    // ── character: the Creador's stat block (the Vue app of main.js) ──
    function showCharacter(data) {
        // main.js mounts itself on #app when it loads: wait for that
        const t0 = Date.now();
        const wait = setInterval(() => {
            const app = document.getElementById('app');
            const vm = app && app.__vue__;
            if (!vm) {
                if (Date.now() - t0 > 8000) { clearInterval(wait); fail(errors.join(' · ') || 'el Creador no arrancó'); }
                return;
            }
            clearInterval(wait);
            vm.activeToggles = [];
            vm.loadCharacter(data);
            showName(tokenName);
            // Impactos and Chi settle once the ranks have loaded: report them when they stop changing
            let timer = 0;
            const report = () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    if (!Object.keys(vm.ranks || {}).length) return report();
                    post({ type: 'stats', hits: Number(vm.hits) || 0, chi: Number((vm.reserves || {}).chi) || 0,
                        actions: Number(vm.actions) || 0, reactions: Number(vm.reactionCount) || 0 });
                }, 400);
            };
            vm.$watch(() => [vm.hits, (vm.reserves || {}).chi, Object.keys(vm.ranks || {}).length].join('|'), report, { immediate: true });
        }, 30);
    }

    // ── clicks on values: to the Dados tab ──
    // The label: data-label, else the ability's name (creature actions, bold names in a character's text)
    function labelFor(el) {
        if (el.dataset.label) return el.dataset.label;
        // a talent ("Talentos: Arcanismo +5, Percepción +6"): the name just before the value
        const line = el.parentElement && el.parentElement.previousElementSibling;
        if (line && /^Talentos/.test(line.textContent.trim())) {
            const name = textBefore(el).split(',').pop().replace(/[\s+]+$/, '').trim();
            if (name) return name;
        }
        const save = el.closest('.save-pill');
        if (save) return 'Salvación ' + save.querySelector('.save-label').textContent.trim();
        const block = el.closest('.action-block, .trait-block');
        const name = block && block.querySelector('.action-name, .trait-name');
        if (name) return name.textContent.trim().replace(/\s*\(\d+\)$/, '').replace(/[:.]$/, '');
        let n = el;
        if (n.parentElement && /^(B|STRONG)$/.test(n.parentElement.tagName)) n = n.parentElement;
        for (let depth = 0; n && depth < 4; depth++) {
            for (let p = n.previousSibling; p; p = p.previousSibling) {
                if (p.nodeType === 1 && /^(B|STRONG)$/.test(p.tagName)) {
                    const t = p.textContent.trim();
                    if (t && !/^[+\-−]?\d/.test(t)) return t.replace(/[:.]$/, '');
                }
            }
            n = n.parentElement;
        }
        return 'Tirada';
    }
    // What sort of roll a value is, and the stats it uses: the token's status effects
    // (Ralentizado: Desventaja on attack, defence and DES rolls…) apply by these.
    const SAVE_STATS = { FIS: ['FUE', 'DES'], VOL: ['CON', 'CAR'], MEN: ['INT', 'SAB'] };
    const STAT_CODE = { str: 'FUE', dex: 'DES', con: 'CON', itl: 'INT', wis: 'SAB', cha: 'CAR' };
    const plainUp = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    function textAfter(el) {
        let t = '';
        for (let n = el.nextSibling; n && t.length < 40; n = n.nextSibling) t += n.textContent;
        return t.toLowerCase();
    }
    function textBefore(el) {
        let t = '';
        for (let n = el.previousSibling; n && t.length < 60; n = n.previousSibling) t = n.textContent + t;
        return t;
    }
    function saveStats(text) {
        const t = plainUp(text);
        return SAVE_STATS[['FIS', 'VOL', 'MEN'].find(k => t.includes(k))] || [];
    }
    // tags of the ability: "(Físico, Ataque…)" → physical stats; "(Mental…)" → mental ones
    function tagStats(el) {
        const block = el.closest('.action-block, .trait-block, p, li, div');
        const head = plainUp(block ? block.textContent.slice(0, 140) : '');
        if (/\bFISIC/.test(head)) return ['FUE', 'DES'];
        if (/\bMENTAL/.test(head)) return ['INT', 'SAB'];
        return [];
    }
    // "Acrobacias +3" in the Talentos line: that talent's stats (the Creador's talent list)
    function talentStats(el) {
        const app = document.getElementById('app'), vm = app && app.__vue__;
        if (!vm || !vm.talents) return null;
        const before = textBefore(el).replace(/[\s+]+$/, '');
        for (const key in vm.talents) {
            const name = (vm.mytalents && vm.mytalents[key] && vm.mytalents[key].name) || vm.talents[key].name;
            if (name && before.endsWith(name))
                return String(vm.talents[key].stat || '').split('/').map(c => STAT_CODE[c.trim()]).filter(Boolean);
        }
        return null;
    }
    function classify(el) {
        const roll = el.dataset.roll || '', label = el.dataset.label || '';
        if (!/^[+\-−]/.test(roll)) return { kind: 'Daño', stats: [] };          // damage and other dice
        if (el.closest('.save-hl')) return { kind: 'Otro', stats: [] };          // the save the target makes
        if (/iniciativa/i.test(label)) return { kind: 'Iniciativa', stats: ['DES'] };
        const save = el.closest('.save-pill, .sb-save');
        if (save || /^salvaci/i.test(label)) return { kind: 'Salvación', stats: saveStats(save ? save.textContent : label) };
        const after = textAfter(el);
        if (/para defender/.test(after) || (el.closest('#statblock-reactions') && el.closest('.attack-bonus')))
            return { kind: 'Defensa', stats: /esquiva/i.test(labelFor(el)) ? ['DES'] : tagStats(el) };
        if (/para (atacar|impactar)/.test(after) || el.closest('.attack-bonus')) return { kind: 'Ataque', stats: tagStats(el) };
        const talent = talentStats(el);
        if (talent) return { kind: 'Talento', stats: talent };
        return { kind: 'Habilidad', stats: tagStats(el) };
    }

    document.addEventListener('click', e => {
        const r = e.target.closest('.rollable');
        if (!r) return;
        e.preventDefault();
        const { kind, stats } = classify(r);
        post({ type: 'roll', roll: r.dataset.roll, label: labelFor(r), kind, stats });
    });

    post({ type: 'ready' });
})();
