/* /simulador — combat simulator page.
 *
 * Starts empty: the visitor uploads Creador fichas / bestiary creatures
 * (.json), which are kept in this browser (localStorage) and sent to the
 * simulator worker (sim_worker.js, Python via Pyodide).
 */
(function () {
    const STORE = 'raldamain.simulador.v1';
    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

    // ── State (persisted per browser) ─────────────────────────────────────
    let state = { uploads: [], party: [], enemies: [], opts: {} };
    try {
        const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
        if (saved && Array.isArray(saved.uploads)) state = Object.assign(state, saved);
    } catch (e) { /* private mode / blocked storage: start empty */ }

    function persist() {
        try {
            localStorage.setItem(STORE, JSON.stringify(state));
        } catch (e) {
            toast('No se pudo guardar en el navegador (¿almacenamiento lleno o bloqueado?). Las fichas siguen aquí hasta cerrar la página.', true);
        }
    }

    let roster = {};       // upload uid -> simulator roster entry
    let ready = false;
    let running = false;

    // Same rule as raldamain/web.py _safe_id (accents removed first)
    const safeId = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'ficha';
    const uidOf = u => `${u.kind}:${u.id}`;

    // ── Worker ────────────────────────────────────────────────────────────
    const worker = new Worker('/assets/js/sim_worker.js?v=20261008');
    worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'status') setEngine(m.text, 'loading');
        else if (m.type === 'ready') { ready = true; setEngine('Listo', 'ok'); sync(); }
        else if (m.type === 'fatal') setEngine('No se pudo cargar el simulador: ' + m.text, 'bad');
        else if (m.type === 'roster') onRoster(m);
        else if (m.type === 'progress') showProgress(m.done, m.total);
        else if (m.type === 'result') onResult(m.result);
        else if (m.type === 'error') {
            if (m.request === 'run') endRun();
            toast(m.text, true);
        }
    };
    function setEngine(text, cls) {
        const el = $('engine');
        el.textContent = text;
        el.className = 'sim-engine ' + cls;
        updateRunButton();
    }
    function sync() {
        if (!ready) return;
        worker.postMessage({ type: 'sync', uploads: state.uploads.map(u => ({ id: u.id, kind: u.kind, data: u.data })) });
    }
    function onRoster(m) {
        roster = {};
        for (const u of state.uploads) {
            const origin = u.kind === 'criatura' ? 'bestiario' : 'ficha';
            const hit = m.roster.find(r => r.file === u.id && r.origin === origin);
            if (hit) roster[uidOf(u)] = hit;
        }
        (m.errors || []).forEach(err => toast(err, true));
        renderUploads();
        renderSides();
    }

    // ── Uploads ───────────────────────────────────────────────────────────
    function detectKind(d) {
        if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
        if (d.stats && typeof d.stats === 'object' && ('ranks' in d || 'race' in d || 'equipment' in d)) return 'ficha';
        if ('hits' in d || ('actions' in d && 'saves' in d)) return 'criatura';
        return null;
    }
    async function addFiles(files) {
        let added = 0;
        const problems = [];
        for (const file of files) {
            let data;
            try {
                data = JSON.parse(await file.text());
            } catch (e) {
                problems.push(`${file.name}: no es un JSON válido`);
                continue;
            }
            const kind = detectKind(data);
            if (!kind) {
                problems.push(`${file.name}: no parece una ficha del Creador ni una criatura del bestiario`);
                continue;
            }
            const stem = file.name.replace(/\.json$/i, '');
            const id = safeId(kind === 'criatura' ? (data.id || stem) : stem);
            const entry = {
                id, kind, data,
                name: data.name || stem,
                level: data.level || '',
                added: Date.now(),
            };
            const i = state.uploads.findIndex(u => u.id === id && u.kind === kind);
            if (i >= 0) state.uploads[i] = entry; else state.uploads.push(entry);
            added++;
        }
        if (added) {
            persist();
            renderUploads();
            sync();
        }
        // one message for the whole drop: what was added and what was not
        const ok = added ? (added === 1 ? 'Ficha añadida.' : `${added} fichas añadidas.`) : '';
        if (problems.length) toast([ok, ...problems].filter(Boolean).join(' '), true);
        else if (ok) toast(ok);
    }
    function removeUpload(uid) {
        state.uploads = state.uploads.filter(u => uidOf(u) !== uid);
        state.party = state.party.filter(e => e.uid !== uid);
        state.enemies = state.enemies.filter(e => e.uid !== uid);
        persist(); renderUploads(); renderSides(); sync();
    }
    function renderUploads() {
        $('clear-all').hidden = !state.uploads.length;
        const el = $('uploads');
        if (!state.uploads.length) {
            el.innerHTML = '<p class="sim-empty">Aún no has subido nada. Descarga una ficha desde el Creador o una criatura del bestiario y súbela aquí.</p>';
            return;
        }
        const list = [...state.uploads].sort((a, b) => a.kind.localeCompare(b.kind) || (a.level || 0) - (b.level || 0) || a.name.localeCompare(b.name));
        el.innerHTML = list.map(u => {
            const uid = uidOf(u);
            const r = roster[uid];
            const problem = ready && !r;
            return `<div class="sim-item${problem ? ' bad' : ''}">
                <div class="sim-item-name">
                    <span class="sim-kind ${u.kind}">${u.kind === 'ficha' ? 'Ficha' : 'Criatura'}</span>
                    <b>${esc(u.name)}</b>
                    <small>${u.level ? 'Nivel ' + esc(u.level) : ''}${r && r.impactos != null ? ' · ' + r.impactos + ' Impactos' : ''}${problem ? ' · no se pudo leer' : ''}</small>
                </div>
                <button class="sim-add" data-uid="${esc(uid)}" data-side="party" ${r ? '' : 'disabled'} title="Añadir al grupo">+ Grupo</button>
                <button class="sim-add" data-uid="${esc(uid)}" data-side="enemies" ${r ? '' : 'disabled'} title="Añadir a los enemigos">+ Enemigos</button>
                <button class="sim-x" data-del="${esc(uid)}" title="Quitar del navegador">✕</button>
            </div>`;
        }).join('');
    }

    // ── Sides ─────────────────────────────────────────────────────────────
    function addToSide(side, uid) {
        const list = state[side];
        const found = list.find(e => e.uid === uid);
        if (found) found.count = Math.min(20, found.count + 1);
        else list.push({ uid, count: 1, row: '' });
        persist(); renderSides();
    }
    function renderSides() {
        for (const side of ['party', 'enemies']) {
            const el = $('side-' + side);
            const list = state[side];
            if (!list.length) {
                el.innerHTML = `<p class="sim-empty">${side === 'party' ? 'Añade fichas con «+ Grupo».' : 'Añade criaturas o fichas con «+ Enemigos».'}</p>`;
                continue;
            }
            el.innerHTML = list.map((e, i) => {
                const u = state.uploads.find(x => uidOf(x) === e.uid);
                return `<div class="sim-member">
                    <b>${esc(u ? u.name : e.uid)}</b>
                    <span class="sim-count">
                        <button data-side="${side}" data-i="${i}" data-d="-1">−</button>
                        <span>×${e.count}</span>
                        <button data-side="${side}" data-i="${i}" data-d="1">+</button>
                    </span>
                    <select data-side="${side}" data-i="${i}" class="sim-row" title="Fila">
                        <option value="" ${!e.row ? 'selected' : ''}>Fila auto</option>
                        <option value="front" ${e.row === 'front' ? 'selected' : ''}>Vanguardia</option>
                        <option value="back" ${e.row === 'back' ? 'selected' : ''}>Retaguardia</option>
                    </select>
                    <button class="sim-x" data-side="${side}" data-rm="${i}" title="Quitar">✕</button>
                </div>`;
            }).join('');
        }
        updateRunButton();
    }
    function updateRunButton() {
        $('run').disabled = !ready || running || !state.party.length || !state.enemies.length;
        $('run').title = !ready ? 'El simulador aún se está cargando'
            : (!state.party.length || !state.enemies.length) ? 'Añade al menos un combatiente a cada bando' : '';
    }

    // ── Run ───────────────────────────────────────────────────────────────
    function sideFor(list) {
        return list.map(e => roster[e.uid] && { id: roster[e.uid].id, count: e.count, row: e.row || undefined }).filter(Boolean);
    }
    function run() {
        const runs = Math.max(1, Math.min(1000, parseInt($('runs').value, 10) || 1));
        state.opts = { runs, seed: parseInt($('seed').value, 10) || 1, turns: $('turns').value, pos: $('pos').checked };
        persist();
        const party = sideFor(state.party), enemies = sideFor(state.enemies);
        if (!party.length || !enemies.length) { toast('Algún combatiente no se pudo leer: revisa tus fichas.', true); return; }
        running = true;
        updateRunButton();
        $('run').textContent = '⏳ Simulando…';
        $('stop').hidden = runs <= 1;
        $('progress').hidden = runs <= 1;
        showProgress(0, runs);
        worker.postMessage({ type: 'run', body: {
            party, enemies, runs, seed: state.opts.seed,
            turn_structure: state.opts.turns, positioning: state.opts.pos,
        } });
    }
    function endRun() {
        running = false;
        $('run').textContent = '⚔ Simular';
        $('stop').hidden = true;
        $('progress').hidden = true;
        updateRunButton();
    }
    function showProgress(done, total) {
        $('progress').firstElementChild.style.width = (total ? 100 * done / total : 0) + '%';
        if (total > 1) $('run').textContent = `⏳ ${done} / ${total}`;
    }
    function onResult(r) {
        endRun();
        $('result').hidden = false;
        const pct = v => (100 * v).toFixed(1) + '%';
        if (r.mode === 'single') {
            const won = r.winner === 'party';
            $('summary').innerHTML = `<span class="sim-big ${won ? 'win' : 'loss'}">${won ? 'Victoria del grupo' : r.winner === 'enemigos' ? 'Victoria de los enemigos' : 'Empate'}</span>
                <span>${r.rounds} rondas</span>`;
            $('out').textContent = r.log;
        } else {
            $('summary').innerHTML = `<span class="sim-big ${r.party_win_rate >= 0.5 ? 'win' : 'loss'}">El grupo gana el ${pct(r.party_win_rate)}</span>
                <span>${r.runs} combates${r.stopped ? ' (detenido)' : ''} · empates ${pct(r.draw_rate)} · ${Number(r.rounds_mean).toFixed(1)} rondas de media</span>`;
            $('out').textContent = r.report;
        }
        $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ── Toast ─────────────────────────────────────────────────────────────
    let toastTimer = null;
    function toast(text, bad) {
        const el = $('toast');
        el.textContent = text;
        el.className = 'sim-toast' + (bad ? ' bad' : '');
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.hidden = true; }, bad ? 6000 : 2500);
    }

    // ── Events ────────────────────────────────────────────────────────────
    $('file').addEventListener('change', e => { addFiles([...e.target.files]); e.target.value = ''; });
    const drop = $('drop');
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => addFiles([...e.dataTransfer.files].filter(f => /\.json$/i.test(f.name))));
    $('clear-all').addEventListener('click', () => {
        if (!confirm('¿Quitar todas tus fichas de este navegador?')) return;
        state.uploads = []; state.party = []; state.enemies = [];
        persist(); renderUploads(); renderSides(); sync();
    });
    $('uploads').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.del) {
            const u = state.uploads.find(x => uidOf(x) === b.dataset.del);
            if (u && confirm(`¿Quitar «${u.name}» de este navegador?`)) removeUpload(b.dataset.del);
        } else if (b.dataset.side) addToSide(b.dataset.side, b.dataset.uid);
    });
    for (const side of ['party', 'enemies']) {
        const el = $('side-' + side);
        el.addEventListener('click', e => {
            const b = e.target.closest('button');
            if (!b) return;
            const list = state[side];
            if (b.dataset.rm != null) list.splice(+b.dataset.rm, 1);
            else if (b.dataset.d) {
                const m = list[+b.dataset.i];
                m.count = Math.max(1, Math.min(20, m.count + (+b.dataset.d)));
            }
            persist(); renderSides();
        });
        el.addEventListener('change', e => {
            if (!e.target.classList.contains('sim-row')) return;
            state[side][+e.target.dataset.i].row = e.target.value;
            persist();
        });
    }
    $('run').addEventListener('click', run);
    $('stop').addEventListener('click', () => worker.postMessage({ type: 'stop' }));

    // Restore options
    if (state.opts.runs) $('runs').value = state.opts.runs;
    if (state.opts.seed) $('seed').value = state.opts.seed;
    if (state.opts.turns) $('turns').value = state.opts.turns;
    if (state.opts.pos === false) $('pos').checked = false;

    renderUploads();
    renderSides();
})();
