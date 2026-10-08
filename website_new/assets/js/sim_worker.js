/* Combat simulator in the browser (/simulador).
 *
 * Runs the real Python simulator (combat-simulator/raldamain) with Pyodide in
 * this Web Worker, so long batches never freeze the page.  The package files
 * listed in combat-simulator/web_manifest.json and the site's rank/equipment
 * data are copied into Pyodide's virtual filesystem with the same layout as
 * the repo, so the simulator finds them exactly where it expects.
 *
 * Messages in:  {type:'sync', uploads}  {type:'run', body}  {type:'stop'}
 * Messages out: status · ready · roster · progress · result · error · fatal
 */
const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
importScripts(PYODIDE + 'pyodide.js');

const ROOT = '/site';
let py = null;
let web = null;
let stopRequested = false;

const say = (type, data = {}) => postMessage({ type, ...data });

async function fetchText(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.text();
}

function write(path, text) {
    py.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')));
    py.FS.writeFile(path, text);
}

async function boot() {
    say('status', { text: 'Cargando Python…' });
    py = await loadPyodide({ indexURL: PYODIDE });
    await py.loadPackage('pyyaml');

    say('status', { text: 'Cargando el simulador…' });
    const manifest = JSON.parse(await fetchText('/combat-simulator/web_manifest.json'));
    await Promise.all(manifest.files.map(async f =>
        write(`${ROOT}/combat-simulator/${f}`, await fetchText(`/combat-simulator/${f}`))));

    say('status', { text: 'Cargando rangos y equipo…' });
    const ranks = JSON.parse(await fetchText('/data/ranks_list.json'));
    await Promise.all(ranks.map(async e => {
        try {
            write(`${ROOT}/data/ranks/${e.id}.json`, await fetchText(`/data/ranks/${encodeURIComponent(e.id)}.json`));
        } catch (err) { /* a rank listed but not published: simply unavailable */ }
    }));
    for (const f of ['equipment.json', 'equipment-abilities.json'])
        write(`${ROOT}/data/builder/${f}`, await fetchText(`/data/builder/${f}`));
    py.FS.mkdirTree(`${ROOT}/data/statblocks`);
    py.FS.mkdirTree(`${ROOT}/data/creatures`);

    py.runPython(`import sys; sys.path.insert(0, '${ROOT}/combat-simulator')`);
    web = py.pyimport('raldamain.web');
    say('ready');
}

// Python errors come with the whole traceback: keep the line that explains it
function cleanError(err) {
    const lines = String((err && err.message) || err).trim().split('\n').filter(l => l.trim());
    return lines[lines.length - 1] || 'Error desconocido';
}

const ready = boot().catch(err => { say('fatal', { text: cleanError(err) }); throw err; });

async function runBatch(body) {
    const { runs } = JSON.parse(web.batch_start(JSON.stringify(body)));
    const step = Math.max(1, Math.min(25, Math.ceil(runs / 40)));
    let done = 0;
    stopRequested = false;
    while (done < runs && !stopRequested) {
        done = web.batch_step(step);
        say('progress', { done, total: runs });
        await new Promise(r => setTimeout(r, 0));  // let a "stop" message in
    }
    const result = JSON.parse(web.batch_report());
    result.stopped = done < runs;
    return result;
}

onmessage = async (e) => {
    const m = e.data;
    if (m.type === 'stop') { stopRequested = true; return; }
    try {
        await ready;
    } catch (err) {
        return;
    }
    try {
        if (m.type === 'sync') {
            say('roster', JSON.parse(web.sync_uploads(JSON.stringify(m.uploads))));
        } else if (m.type === 'run') {
            const result = (m.body.runs || 1) <= 1
                ? JSON.parse(web.run_single(JSON.stringify(m.body)))
                : await runBatch(m.body);
            say('result', { result });
        }
    } catch (err) {
        say('error', { text: cleanError(err), request: m.type });
    }
};
