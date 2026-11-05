/* Simulador electoral · INTERFAZ (/mundo/utils/elecciones). El modelo está en model.js. */
import * as M from "./model.js";

const { clone, hash } = M;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }
};
const pct = p => Math.round(p * 100) + "%";
const fmt = x => (x > 0 ? "+" : "") + (Math.round(x * 10) / 10).toLocaleString("es-ES");
const fmtN = n => Math.round(n).toLocaleString("es-ES");
const fmtP = (x, d = 1) => (x || 0).toLocaleString("es-ES", { maximumFractionDigits: d });
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";
const KEY_CUR = "raldamain-elecciones-actual", KEY_SC = "raldamain-elecciones-escenarios";
const PRESET_DIR = "/data/elecciones/";

let st = null, presets = [];
const AX = () => st.axes;
const IDS = () => M.IDS(st);
const party = id => M.party(st, id);
const candName = id => party(id)?.cand ?? id;
const pName = id => party(id)?.name ?? id;
const curProp = () => st.proposals.find(p => p.id === st.mode);
const T = () => st.meta;
const FIXED = { I: "var(--i)", Y: "var(--yes)", N: "var(--no)", A: "var(--i)" };
function col(k) {
  if (FIXED[k]) return FIXED[k];
  if (k.startsWith("L:")) { const p = party(k.slice(2)); return p ? `color-mix(in srgb, ${p.color} 42%, var(--surface))` : FIXED.I; }
  return party(k)?.color || FIXED.I;
}
/* Orden de izquierda a derecha en el hemiciclo: el orden de la lista de partidos, con los neutrales en el centro. */
function ordC() {
  const ids = IDS(), mid = Math.floor(ids.length / 2), out = [];
  ids.forEach((id, i) => { if (i < mid) out.push(id, "L:" + id); });
  out.push("I");
  ids.forEach((id, i) => { if (i >= mid) out.push("L:" + id, id); });
  return out;
}
const labC = c => c === "I" ? "Neutral" : c.startsWith("L:") ? `Neutral, se inclina ${candName(c.slice(2))}` : candName(c);
const shortC = c => c === "I" ? "Neutral" : c.startsWith("L:") ? `→ ${pName(c.slice(2))}` : candName(c);
const labN = c => c === "I" ? "Sin partido · neutral" : c.startsWith("L:") ? `Sin partido · se inclina ${pName(c.slice(2))}` : pName(c);
const ORDER_P = { N: 0, A: 1, Y: 2 };
const LAB_P = { Y: "Sí", N: "No", A: "En duda" };
const methodName = id => M.METHODS.find(m => m.id === id)?.short || id;
const chairOf = () => st.chair ? st.electors.find(e => "e" + e.id === st.chair) : null;

/* ---------- Resultados ---------- */
function evaluate() {
  const ch = M.chamber(st), V = M.voters(st, ch), prop = curProp();
  const asParty = v => ({ cls: party(v.party) ? v.party : M.leanCls(M.evalCand(st, v).model), prob: null });
  if (st.mode === "none") return { ch, V, none: true, R: V.map(v => ({ v, r: asParty(v) })) };
  if (prop) return { ch, V, prop, R: V.map(v => ({ v, r: M.evalProp(st, v, prop) })) };
  if (st.election.kind === "direct") return { ch, V, direct: M.directElection(st, ch), R: V.map(v => ({ v, r: asParty(v) })) };
  return { ch, V, cand: true, R: V.map(v => ({ v, r: M.evalCand(st, v) })) };
}
const sw = (c, round = true) => `<span class="sw" style="background:${c};${round ? "border-radius:50%" : ""}"></span>`;
const byParty = E => E.none || E.direct;

function hemicycle(R, isProp, partyMode) {
  const svg = $("hemi"), N = R.length;
  if (!N) { svg.innerHTML = ""; return; }
  const rows = Math.min(N, Math.max(3, Math.min(12, Math.round(Math.sqrt(N / 1.6)))));
  const r0 = 0.42, radii = Array.from({ length: rows }, (_, i) => r0 + (1 - r0) * (rows === 1 ? 1 : i / (rows - 1)));
  const sumR = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map(r => Math.max(1, Math.round(N * r / sumR)));
  let diff = N - counts.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; diff !== 0; i = (i - 1 + rows) % rows) { if (diff > 0) { counts[i]++; diff--; } else if (counts[i] > 1) { counts[i]--; diff++; } }
  const seats = [];
  radii.forEach((r, ri) => { const n = counts[ri]; for (let j = 0; j < n; j++) seats.push({ a: n === 1 ? Math.PI / 2 : Math.PI * (1 - j / (n - 1)), r }); });
  seats.sort((p, q) => q.a - p.a || p.r - q.r);
  const ord = isProp ? ORDER_P : Object.fromEntries(ordC().map((k, i) => [k, i]));
  const sk = x => x.r.prob ?? (.5 + (x.v.pos[st.axX] ?? 0) / 20);
  const sorted = [...R].sort((a, b) => (ord[a.r.cls] ?? 99) - (ord[b.r.cls] ?? 99) || sk(a) - sk(b));
  const R0 = 92, cx = 100, cy = 102;
  const gap = (1 - r0) * R0 / Math.max(1, rows - 1), arc = Math.PI * R0 / Math.max(1, counts[rows - 1] - 1);
  const dr = Math.max(0.9, Math.min(gap, arc) * 0.4);
  svg.innerHTML = seats.map((p, i) => {
    const { v, r } = sorted[i];
    const x = cx + Math.cos(p.a) * p.r * R0, y = cy - Math.sin(p.a) * p.r * R0;
    const t = partyMode ? `${v.name} · ${v.bloc} · ${labN(r.cls)}`
      : isProp ? `${v.name} · ${v.bloc} · ${LAB_P[r.cls]} (${pct(r.prob)} Sí)`
      : `${v.name} · ${v.bloc} · ${labC(r.cls)} (${pct(r.prob)} ${pName(r.top)})`;
    return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${dr.toFixed(2)}" fill="${col(r.cls)}" data-tip="${esc(t)}" data-edit="${esc(v.key)}"></circle>`;
  }).join("");
}

/* La segunda vuelta en la cámara: cada miembro elige entre los dos finalistas */
function runoff(E, a, b) {
  const out = { [a]: 0, [b]: 0, I: 0 };
  E.R.forEach(({ v, r }) => {
    if (r.locked === a || r.locked === b) { out[r.locked]++; return; }
    const q = M.evalCand(st, v, [a, b]);
    out[q.model === "I" ? "I" : q.top]++;
  });
  return out;
}

function board(E) {
  const { R, prop } = E, N = R.length, ids = IDS(), t = T();
  const cnt = k => R.filter(x => x.r.cls === k).length;
  const card = (lab, c, val, split) => `<div class="pcard"><div class="lab">${sw(c, false)}${esc(lab)}</div><div class="val">${val}</div><div class="split">${split}</div></div>`;
  let maj = null, segs, verdict, sub = [];
  const chairName = chairOf()?.name;
  const composition = () => `Composición: ${ids.map(id => `${esc(pName(id))} <span class="num">${R.filter(x => x.v.party === id).length}</span>`).join(" · ")} · sin partido <span class="num">${R.filter(x => !party(x.v.party)).length}</span>`;
  if (E.none) {
    const split = k => {
      const rs = R.filter(x => x.r.cls === k), e = rs.filter(x => x.v.kind === "e").length;
      return `${e} designados · ${rs.length - e} elegidos`;
    };
    const free = ids.reduce((a, id) => a + cnt("L:" + id), 0) + cnt("I");
    $("cards").innerHTML = ids.map(id => card(pName(id), col(id), cnt(id), split(id))).join("")
      + card("Sin partido", col("I"), free, ids.map(id => `${cnt("L:" + id)} → ${esc(pName(id))}`).join(" · ") + ` · ${cnt("I")} neutrales`);
    segs = ordC().map(k => [k, cnt(k)]);
    maj = Math.floor(N / 2) + 1;
    const top = [...ids].sort((a, b) => cnt(b) - cnt(a))[0];
    verdict = top && cnt(top) >= maj ? [col(top), `${pName(top)} tiene mayoría absoluta`, `${cnt(top)} de ${N} ${t.members} (mayoría ${maj}).`]
      : ["var(--brass)", "Sin votación", `Solo posiciones ideológicas, coloreadas por partido. Ningún partido llega solo a la mayoría (${maj}).`];
    const mean = AX().map((_, d) => R.reduce((a, x) => a + x.v.pos[d], 0) / Math.max(1, N));
    const med = d => { const xs = R.map(x => x.v.pos[d]).sort((a, b) => a - b); return xs[Math.floor(N / 2)] ?? 0; };
    sub.push(`Centro de la cámara (media): ${AX().map((a, d) => `${esc(a.k)} <span class="num">${fmt(mean[d])}</span>`).join(" · ")}`);
    sub.push(`${cap(t.member)} mediano: ${AX().map((a, d) => `${esc(a.k)} <span class="num">${fmt(med(d))}</span>`).join(" · ")}`);
  } else if (E.direct) {
    const D = E.direct, last = D.rounds[D.rounds.length - 1] || D.votes;
    if (D.method === "college") {
      $("cards").innerHTML = ids.map(id => card(candName(id), col(id), fmtP(D.ev[id], 1), `${esc(pName(id))} · ${fmtP(D.V ? D.votes[id] / D.V * 100 : 0)} % del voto popular`)).join("");
      segs = ids.map(id => [id, D.ev[id]]);
      maj = D.need;
      verdict = D.win ? [col(D.win), `${candName(D.win)} es elegido ${t.office.toLowerCase()}`, `${fmtP(D.ev[D.win])} votos electorales de ${D.T} (mayoría ${D.need}).`]
        : [col("I"), "Nadie llega a la mayoría del colegio", `Hacen falta ${D.need} votos electorales. Tendría que decidir la cámara.`];
      $("capTotal").textContent = D.T; $("capMaj").textContent = D.need;
    } else {
      const V2 = Object.values(last).reduce((a, b) => a + b, 0);
      $("cards").innerHTML = ids.map(id => card(candName(id), col(id), `${fmtP(D.V ? D.votes[id] / D.V * 100 : 0)}<small style="font-size:14px"> %</small>`,
        `${esc(pName(id))} · ${fmtN(D.votes[id])} votos${D.rounds.length > 1 ? last[id] != null ? ` · última vuelta ${fmtP(V2 ? last[id] / V2 * 100 : 0)} %` : " · eliminado" : ""}`)).join("");
      segs = ids.map(id => [id, last[id] || 0]);
      const W = D.win;
      const how = D.method === "tworound" ? (D.rounds.length > 1 ? "en segunda vuelta" : "en primera vuelta") : D.method === "irv" ? `tras ${D.rounds.length - 1} eliminaciones` : "por mayoría simple";
      verdict = W ? [col(W), `${candName(W)} es elegido ${t.office.toLowerCase()}`, `${cap(how)}: ${fmtP(V2 ? last[W] / V2 * 100 : 0)} % de los votos válidos.`] : [col("I"), "Sin votos", "Ningún distrito tiene votos."];
      $("capTotal").textContent = N;
    }
    sub.push(`Elección directa · ${esc(M.DIRECT_METHODS.find(m => m.id === D.method)?.name || D.method)}. El hemiciclo muestra la cámara por partidos.`);
    sub.push(composition());
  } else if (!prop) {
    maj = M.threshold(st.election.rule, N);
    const simple = st.election.rule === "simple";
    const pl = id => cnt(id), ln = id => cnt("L:" + id), i = cnt("I");
    const neu = ids.reduce((a, id) => a + ln(id), 0) + i;
    $("cards").innerHTML = ids.map(id => card(candName(id), col(id), pl(id), `${esc(pName(id))} · comprometidos · ${ln(id)} neutrales más se le inclinan`)).join("")
      + card("Neutrales", col("I"), neu, ids.map(id => `${ln(id)} → ${esc(pName(id))}`).join(" · ") + ` · ${i} sin inclinación`);
    segs = ordC().map(k => [k, cnt(k)]);
    const byPl = [...ids].sort((a, b) => pl(b) + ln(b) - pl(a) - ln(a) || pl(b) - pl(a));
    const W = simple ? null : ids.find(id => pl(id) >= maj);
    if (simple) {
      const tops = [...ids].sort((a, b) => pl(b) + ln(b) - pl(a) - ln(a));
      const a = tops[0], b = tops[1];
      const va = pl(a) + ln(a), vb = b ? pl(b) + ln(b) : 0;
      verdict = va > vb ? [col(a), `${candName(a)} es elegido ${t.office.toLowerCase()}`, `Mayoría simple: ${va} votos (contando inclinaciones) frente a ${vb}.`]
        : [col("I"), `Empate: desempata ${chairName || t.chairTitle}`, `${candName(a)} y ${candName(b)} con ${va} votos cada uno.`];
      maj = null;
    } else if (W) verdict = [col(W), `${candName(W)} es elegido ${t.office.toLowerCase()}`, `${pl(W)} comprometidos de ${N} (mayoría ${maj}).`];
    else if (neu === 0 && ids.length === 2 && pl(byPl[0]) === pl(byPl[1])) verdict = [col("I"), `Empate: desempata ${chairName || t.chairTitle}`, chairName ? `${chairName} decide.` : "Decide quien presida."];
    else {
      const L = ids.find(id => pl(id) + ln(id) >= maj);
      const lead = L ? ` Si los neutrales votan según su inclinación, gana ${candName(L)}.` : " Ni siquiera con sus inclinaciones llega nadie: hará falta una coalición.";
      verdict = [col("I"), "Nadie llega a la mayoría", `Faltan: ${ids.map(id => `${candName(id)} ${Math.max(0, maj - pl(id))}`).join(" · ")}. Hay ${neu} neutrales en juego.${lead}`];
      if (st.election.rounds === "runoff" && ids.length > 1) {
        const [a, b] = byPl, r2 = runoff(E, a, b);
        const w2 = r2[a] === r2[b] ? null : r2[a] > r2[b] ? a : b;
        verdict = [col(w2 || "I"), w2 ? `${candName(w2)} gana en segunda vuelta` : `Empate en segunda vuelta: desempata ${chairName || t.chairTitle}`,
          `Nadie llegó a ${maj} en la primera. Segunda vuelta entre ${candName(a)} y ${candName(b)}: ${r2[a]} a ${r2[b]}, ${r2.I} abstenciones.`];
      }
    }
    sub.push(`Con las inclinaciones: ${ids.map(id => `${esc(candName(id))} ${pl(id) + ln(id)}`).join(" · ")} · sin inclinación ${i}`);
    if (ids.length > 2 && !W && !simple) {
      const pairs = [];
      ids.forEach((a, x) => ids.slice(x + 1).forEach(b => pairs.push([a, b, pl(a) + pl(b)])));
      sub.push(`Coaliciones (comprometidos): ${pairs.sort((p, q) => q[2] - p[2]).slice(0, 6).map(([a, b, n]) => `${esc(pName(a))} + ${esc(pName(b))} <span class="num">${n}</span>${n >= maj ? " ✓" : ""}`).join(" · ")}`);
    }
    const free = { ...st, params: { ...st.params, honor: false } };
    const pure = E.V.map(v => M.evalCand(free, v).model);
    sub.push(`Solo por ideología (sin compromisos): ${ids.map(id => `${esc(candName(id))} ${pure.filter(x => x === id).length}`).join(" · ")} · sin inclinación ${pure.filter(x => x === "I").length}`);
    const exp = id => R.reduce((a, x) => a + (x.r.locked ? (x.r.locked === id ? 1 : 0) : x.r.probs[id]), 0);
    sub.push(`Voto esperado sumando probabilidades: ${ids.map(id => `${esc(candName(id))} <span class="num">${exp(id).toFixed(1)}</span>`).join(" · ")}`);
    sub.push(`Promesas: ${ids.map(id => { const ps = st.proposals.filter(p => p.promise[id]).map(p => p.name); return `${esc(candName(id))}: ${ps.length ? esc(ps.join(", ")) : "ninguna"}`; }).join(". ")}.`);
  } else {
    maj = prop.rule === "simple" ? null : M.threshold(prop.rule, N);
    const y = cnt("Y"), n = cnt("N"), a = cnt("A");
    const ruleTxt = prop.rule === "simple" ? "mayoría simple de los que votan" : `${M.RULES[prop.rule].toLowerCase()} (${maj})`;
    $("cards").innerHTML = card("Sí", col("Y"), y, `${R.filter(x => x.r.cls === "Y" && x.r.ov).length} por pacto`)
      + card("No", col("N"), n, `${R.filter(x => x.r.cls === "N" && x.r.red).length} por línea roja`)
      + card("En duda", col("A"), a, "probable abstención");
    segs = [["N", n], ["A", a], ["Y", y]];
    const pass = prop.rule === "simple" ? y > n : y >= maj;
    const chair = st.chair ? R.find(x => x.v.key === st.chair) : null;
    if (prop.rule === "simple" && y === n) verdict = [col("A"), `Empate: desempata ${chairName || t.chairTitle}`, chair ? `Su voto previsto: ${LAB_P[chair.r.cls]}.` : "Decide quien presida."];
    else if (pass) verdict = [col("Y"), "Aprobada", `${y} Sí frente a ${n} No. Hace falta ${ruleTxt}.`];
    else if (prop.rule !== "simple" && y + a >= maj) verdict = [col("A"), "En el aire", `${y} Sí: faltan ${maj - y} para ${ruleTxt}, y hay ${a} en duda.`];
    else verdict = [col("N"), "Rechazada", `${y} Sí frente a ${n} No. Hace falta ${ruleTxt}.`];
    const exp = R.reduce((s, x) => s + (x.r.ov ? (x.r.ov === "Y" ? 1 : 0) : x.r.prob), 0);
    sub.push(`Sí esperados sumando probabilidades: <span class="num">${exp.toFixed(1)}</span>`);
    sub.push(`Promotor: ${prop.sponsor ? esc(pName(prop.sponsor)) + "; su partido tiende a votar en bloque" : "ninguno (sin disciplina de partido)"}.`);
  }
  if (!E.direct || E.direct.method !== "college") { $("capTotal").textContent = N; $("capMaj").textContent = maj ?? "—"; }
  $("capWord").textContent = `${E.direct?.method === "college" ? "votos electorales" : t.members} · umbral`;
  $("verdict").innerHTML = `<span class="dot" style="background:${verdict[0]}"></span><div><strong>${esc(verdict[1])}</strong><span>${esc(verdict[2])}</span></div>`;
  const total = segs.reduce((a, [, c]) => a + c, 0) || 1;
  $("mbar").innerHTML = segs.filter(([, c]) => c).map(([k, c]) => `<div style="width:${c / total * 100}%;background:${col(k)}" data-tip="${esc((byParty(E) ? (E.direct ? candName(k) : labN(k)) : prop ? LAB_P[k] : labC(k)) + ": " + fmtP(c, 0))}"></div>`).join("");
  const tick = $("mtick");
  if (maj && !(E.direct && E.direct.method !== "college")) { tick.style.display = ""; tick.style.left = `calc(${maj / total * 100}% - 1px)`; tick.dataset.label = `${maj}`; }
  else tick.style.display = "none";
  $("subline").innerHTML = sub.map(s => `<div>${s}</div>`).join("");
  hemicycle(R, !!prop, byParty(E));
}

/* ---------- Lectura del máster ---------- */
function topAxes(c) {
  const idx = c.map((x, d) => [x, d]).filter(([x]) => Math.abs(x) > 0.01).sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]));
  return idx.slice(0, 2).map(([x, d]) => `${x > 0 ? "+" : "−"} ${AX()[d].k}`).join(" · ");
}
function whyCand(v, r) {
  if (!r.second) return "";
  const A = party(r.top).pos, B = party(r.second).pos;
  const c = v.pos.map((x, d) => (v.w?.[d] ?? 1) * ((x - B[d]) ** 2 - (x - A[d]) ** 2) / 100);
  return c.map((x, d) => [x, d]).sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])).slice(0, 2)
    .map(([x, d]) => `${AX()[d].k} → ${pName(x > 0 ? r.top : r.second)}`).join(" · ");
}
const slateLabel = v => v.kind === "n" ? `${T().national} · ${pName(v.pid)}` : `Lista ${pName(v.pid)} · ${v.bloc}`;
const editBtn = v => `<button class="link" data-edit="${esc(v.key)}">${esc(v.kind === "e" ? v.name : slateLabel(v))}</button>`;
function uniqBlocs(list) { const seen = new Set(); return list.filter(x => !seen.has(x.v.key) && seen.add(x.v.key)); }
function insights(E) {
  const { R, prop } = E;
  $("ins").closest("section").hidden = !!E.none;
  if (E.none) return;
  const box = (title, items, empty) => `<div class="ibox"><h3>${esc(title)}</h3>${items.length ? `<ul>${items.join("")}</ul>` : `<div class="note">${esc(empty)}</div>`}</div>`;
  if (E.direct) {
    $("insNote").textContent = "Dónde se decide la elección directa: los distritos más reñidos y adónde van los votos de los eliminados.";
    const ids = IDS();
    const close = st.districts.map((d, di) => ({ d, di, e: M.shares(st, d) })).map(x => {
      const r = [...ids].sort((a, b) => x.e[b] - x.e[a]);
      return { ...x, a: r[0], b: r[1], m: x.e[r[0]] - (r[1] ? x.e[r[1]] : 0) };
    }).sort((p, q) => p.m - q.m).slice(0, 8);
    const cl = close.map(x => `<li><span>${esc(x.d.name)}<div class="why">${esc(candName(x.a))} sobre ${esc(x.b ? candName(x.b) : "nadie")} · ${x.d.el} escaños · ${fmtN(x.d.pop)} hab.</div></span><span class="num">${fmtP(x.m)} pts</span></li>`);
    const D = E.direct, alive = D.rounds.length > 1 ? Object.keys(D.rounds[D.rounds.length - 1]) : [];
    const tr = D.rounds.length > 1 ? ids.filter(id => !alive.includes(id) && D.votes[id] > 0).map(id => {
      const t = M.transfer(st, id, alive);
      return `<li><span>${esc(candName(id))}<div class="why">${alive.map(a => `${esc(pName(a))} ${pct(t[a])}`).join(" · ")}</div></span><span class="num">${fmtN(D.votes[id])}</span></li>`;
    }) : [];
    $("ins").innerHTML = box("Distritos más reñidos", cl, "No hay distritos.") + box("Transferencias de los eliminados", tr, "No hizo falta transferir votos.");
    return;
  }
  if (!prop) {
    $("insNote").textContent = "Quién está en juego y dónde hay grietas entre el compromiso de cada miembro y lo que su ideología le pide.";
    const free = uniqBlocs(R.filter(x => !x.r.locked)).sort((a, b) => IDS().indexOf(a.r.top) - IDS().indexOf(b.r.top) || b.r.prob - a.r.prob);
    const freeL = free.map(({ v, r }) => `<li><span>${editBtn(v)}<div class="why">${esc(whyCand(v, r))}</div></span><span class="chip">${sw(col(M.leanCls(r.model)))}${r.model === "I" ? "Sin inclinación" : `Se inclina ${esc(pName(r.model))}`} · ${pct(r.prob)}</span></li>`);
    const cracks = uniqBlocs(R.filter(x => x.r.locked && x.r.model !== x.r.locked)).sort((a, b) => a.r.probs[a.r.locked] - b.r.probs[b.r.locked]);
    const crL = cracks.map(({ v, r }) => `<li><span>${editBtn(v)}<div class="why">Comprometido con ${esc(candName(r.locked))}; su ideología dice ${esc(r.model === "I" ? "duda" : candName(r.model))}</div></span><span class="num">${pct(r.probs[r.locked])} ${esc(pName(r.locked))}</span></li>`);
    $("ins").innerHTML = box(`${cap(T().members)} libres y su inclinación`, freeL, `Todos los ${T().members} están comprometidos.`)
      + box("Grietas: compromisos frente a ideología", crL, "Ningún comprometido tiene una ideología que le lleve a otro lado.");
  } else {
    $("insNote").textContent = "Los votos bisagra (los más cerca del 50 %) y qué ejes los empujan; y las líneas rojas que la propuesta pisa.";
    const hinge = uniqBlocs(R.filter(x => !x.r.ov && !x.r.red)).sort((a, b) => Math.abs(a.r.prob - .5) - Math.abs(b.r.prob - .5)).slice(0, 10);
    const hL = hinge.map(({ v, r }) => `<li><span>${editBtn(v)}<div class="why">${esc(topAxes(r.c) || "no le afecta")}${r.cue ? ` · partido ${fmt(r.cue)}` : ""}</div></span><span class="num">${pct(r.prob)} Sí</span></li>`);
    const reds = uniqBlocs(R.filter(x => x.r.red && !x.r.ov)).map(({ v, r }) => `<li><span>${editBtn(v)}<div class="why">Línea roja: ${esc(AX()[r.red.ax].k)} hacia ${esc(r.red.dir > 0 ? AX()[r.red.ax].b : AX()[r.red.ax].a)}</div></span><span class="flag">No</span></li>`);
    $("ins").innerHTML = box("Votos bisagra", hL, "No hay votos en juego.") + box("Líneas rojas activadas", reds, "La propuesta no pisa ninguna línea roja.");
  }
}

/* ---------- Mapa ---------- */
function mapView(E) {
  const { R, prop } = E, X = st.axX, Y = st.axY, A = AX();
  const sx = v => 50 + (v + 10) / 20 * 360, sy = v => 400 - (v + 10) / 20 * 360;
  let s = `<rect x="50" y="40" width="360" height="360" fill="none" stroke="var(--rule)"/>`;
  for (const g of [-5, 0, 5]) s += `<line x1="${sx(g)}" y1="40" x2="${sx(g)}" y2="400" stroke="var(--rule)" ${g ? 'stroke-dasharray="3 4"' : ""}/><line x1="50" y1="${sy(g)}" x2="410" y2="${sy(g)}" stroke="var(--rule)" ${g ? 'stroke-dasharray="3 4"' : ""}/>`;
  s += `<text x="50" y="420" font-size="12" fill="var(--muted)">← ${esc(A[X].a)}</text><text x="410" y="420" font-size="12" fill="var(--muted)" text-anchor="end">${esc(A[X].b)} →</text>`;
  s += `<text x="16" y="400" font-size="12" fill="var(--muted)" transform="rotate(-90 16 400)">← ${esc(A[Y].a)}</text><text x="16" y="40" font-size="12" fill="var(--muted)" transform="rotate(-90 16 40)" text-anchor="end">${esc(A[Y].b)} →</text>`;
  const marks = [], under = [];
  if (st.mapDist === "centers") st.districts.forEach(d => {
    const x = sx(d.center[X]), y = sy(d.center[Y]), r = (d.spread ?? 4) / 20 * 360;
    under.push(`<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r}" fill="var(--brass)" fill-opacity=".05" stroke="var(--brass)" stroke-opacity=".35" stroke-dasharray="3 3"/><text x="${x}" y="${y - 4}" font-size="9" text-anchor="middle" fill="var(--brass)" pointer-events="none">${esc(d.name)}</text>`);
  });
  if (prop) {
    const t = prop.t.map((v, d) => v == null ? st.sq[d] : v);
    marks.push(`<line x1="${sx(st.sq[X])}" y1="${sy(st.sq[Y])}" x2="${sx(t[X])}" y2="${sy(t[Y])}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    marks.push(`<rect x="${sx(st.sq[X]) - 6}" y="${sy(st.sq[Y]) - 6}" width="12" height="12" fill="var(--surface)" stroke="var(--ink)" stroke-width="2" data-tip="Statu quo"/>`);
    marks.push(`<path d="M${sx(t[X])},${sy(t[Y]) - 9} l2.6,6 6.4,.6 -4.9,4.2 1.5,6.3 -5.6,-3.4 -5.6,3.4 1.5,-6.3 -4.9,-4.2 6.4,-.6z" fill="var(--brass)" stroke="var(--surface)" data-tip="${esc(prop.name)}"/>`);
  } else {
    st.parties.forEach(p => {
      const x = sx(p.pos[X]), y = sy(p.pos[Y]);
      marks.push(`<path d="M${x},${y - 10} L${x + 10},${y} L${x},${y + 10} L${x - 10},${y}Z" fill="${p.color}" stroke="var(--surface)" stroke-width="2" data-tip="${esc(`${p.cand} · ${p.name}`)}"/>`);
    });
    marks.push(`<rect x="${sx(st.sq[X]) - 5}" y="${sy(st.sq[Y]) - 5}" width="10" height="10" fill="var(--surface)" stroke="var(--muted)" stroke-width="1.5" data-tip="Statu quo"/>`);
  }
  const jit = (id, m) => ((+hash(String(id)) % 1000) / 1000 - .5) * m;
  const pts = [], labs = [], mode = st.mapLab || "surname";
  const sur = n => n.trim().split(/\s+/).slice(1).join(" ") || n;
  const surCount = {};
  st.electors.forEach(e => { const k = sur(e.name); surCount[k] = (surCount[k] || 0) + 1; });
  const short = v => mode === "full" ? v.name : surCount[sur(v.name)] > 1 ? `${v.name.trim()[0]}. ${sur(v.name)}` : sur(v.name);
  const label = (x, y, t, anchor = "start") => labs.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="9.5" fill="var(--ink)" stroke="var(--surface)" stroke-width="3" paint-order="stroke" stroke-linejoin="round" pointer-events="none">${esc(t)}</text>`);
  const seatsOf = key => R.filter(x => x.v.key === key).length;
  uniqBlocs(R).forEach(({ v, r }) => {
    const x = sx(v.pos[X]), y = sy(v.pos[Y]);
    const lab = byParty(E) ? labN(r.cls) : prop ? LAB_P[r.cls] : labC(r.cls);
    if (v.kind !== "e") {
      const n = seatsOf(v.key), rad = 6 + Math.sqrt(n) * 2.2;
      pts.push(`<g class="pt" data-edit="${esc(v.key)}" data-tip="${esc(`${slateLabel(v)} (${n}) · ${lab}`)}"><circle cx="${x}" cy="${y}" r="${rad}" fill="${col(r.cls)}" fill-opacity=".35" stroke="${col(r.cls)}" stroke-width="2"/><text x="${x}" y="${y + 4}" font-size="11" text-anchor="middle" fill="var(--ink)" font-family="var(--font-data)">${n}</text></g>`);
      if (mode !== "off") label(x, y + rad + 10, mode === "full" ? slateLabel(v) : v.kind === "n" ? T().national : v.bloc, "middle");
    } else {
      const jx = x + jit(v.id, 9), jy = y + jit(v.id * 7, 9);
      if (mode !== "off") label(jx + 6.5, jy + 3.2, short(v));
      pts.push(`<circle class="pt" cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" r="4.6" fill="${col(r.cls)}" stroke="var(--surface)" stroke-width="1" data-edit="${esc(v.key)}" data-tip="${esc(`${v.name} · ${v.bloc} · ${lab} (${A[X].k} ${v.pos[X]}, ${A[Y].k} ${v.pos[Y]})`)}"/>`);
    }
  });
  $("map").innerHTML = s + under.join("") + pts.join("") + marks.join("") + labs.join("");
  const items = prop ? [["Y", "Sí"], ["N", "No"], ["A", "En duda"]]
    : byParty(E) ? ordC().map(k => [k, labN(k)])
    : ordC().map(k => [k, k === "I" ? "Neutral" : k.startsWith("L:") ? `Neutral → ${candName(k.slice(2))}` : `${candName(k)} (comprometido)`]);
  $("mapLegend").innerHTML = items.map(([k, l]) => `<div>${sw(col(k))}${esc(l)}</div>`).join("")
    + (prop ? `<div><span style="color:var(--brass)">★</span> Propuesta · □ statu quo</div>` : `<div>◆ Candidatos · □ statu quo</div>`);
}

/* ---------- Bloques ---------- */
function blocNames(R) {
  const names = [...st.bodies, ...st.districts.map(d => d.name), T().national];
  const extra = [...new Set(R.map(x => x.v.bloc))].filter(b => !names.includes(b));
  return [...names, ...extra];
}
function blocs(E) {
  const { R, prop, ch } = E;
  const distLab = b => {
    const di = st.districts.findIndex(x => x.name === b); if (di < 0) return esc(b);
    const res = ch.dres[di];
    return `${esc(b)} <span class="muted">· ${res.winners.length ? res.winners.map(id => `${esc(pName(id))} ${res.seatsBy[id]}`).join(", ") : "sin escaños"}</span>`;
  };
  if (byParty(E)) {
    const tint = m => `background:color-mix(in srgb, var(--brass) ${Math.round(Math.abs(m) * 3.5)}%, transparent)`;
    const row = (lab, rows) => {
      const mean = AX().map((_, d) => rows.reduce((a, x) => a + x.v.pos[d], 0) / rows.length);
      return `<tr><td>${lab}</td><td class="c num">${rows.length}</td>${mean.map(m => `<td class="c num" style="${tint(m)}">${fmt(m)}</td>`).join("")}</tr>`;
    };
    $("blocHead").innerHTML = `<tr><th>Bloque</th><th class="c">Escaños</th>${AX().map(a => `<th class="c" data-tip="${esc(`− ${a.a} · + ${a.b}`)}">${esc(a.k)}</th>`).join("")}</tr>`;
    $("blocBody").innerHTML = blocNames(R).map(b => { const rows = R.filter(x => x.v.bloc === b); return rows.length ? row(distLab(b), rows) : ""; }).join("")
      + [...st.parties.map(p => [p.id, p.name]), ["N", "sin partido"]].map(([k, l]) => { const rows = R.filter(x => k === "N" ? !party(x.v.party) : x.v.party === k); return rows.length ? row(`<strong>Todos: ${esc(l)}</strong>`, rows) : ""; }).join("")
      + (R.length ? row(`<strong>${esc(T().chamber)} entero</strong>`, R) : "");
    return;
  }
  const keys = prop ? ["Y", "A", "N"] : ordC();
  $("blocHead").innerHTML = `<tr><th>Bloque</th><th class="c">Escaños</th>${keys.map(k => `<th class="c">${sw(col(k), false)} ${esc(prop ? LAB_P[k] : shortC(k))}</th>`).join("")}<th>Reparto</th>${prop ? `<th class="c">P(Sí) media</th>` : ""}</tr>`;
  $("blocBody").innerHTML = blocNames(R).map(b => {
    const rows = R.filter(x => x.v.bloc === b); if (!rows.length) return "";
    const c = k => rows.filter(x => x.r.cls === k).length;
    const mean = rows.reduce((a, x) => a + x.r.prob, 0) / rows.length;
    return `<tr><td>${distLab(b)}</td><td class="c num">${rows.length}</td>${keys.map(k => `<td class="c num">${c(k) || `<span class="muted">·</span>`}</td>`).join("")}<td><div class="sbar">${keys.map(k => `<div style="width:${c(k) / rows.length * 100}%;background:${col(k)}"></div>`).join("")}</div></td>${prop ? `<td class="c num">${pct(mean)}</td>` : ""}</tr>`;
  }).join("");
}

/* ---------- Miembros ---------- */
function roll(E) {
  const { R, prop } = E;
  const fb = $("fBloc").value, fr = $("fRes").value, ft = $("fText").value.trim().toLowerCase();
  const rows = uniqBlocs(R).filter(({ v, r }) => (!fb || v.bloc === fb) && (!fr || r.cls === fr) && (!ft || (v.name + " " + v.role).toLowerCase().includes(ft)));
  const seatsOf = key => R.filter(x => x.v.key === key).length;
  const who = v => v.kind !== "e"
    ? `<button class="link" data-edit="${esc(v.key)}">${esc(slateLabel(v))}</button><small>${seatsOf(v.key)} escaños · votan en bloque</small>`
    : `<button class="link" data-edit="${esc(v.key)}">${esc(v.name)}</button><small>${esc(v.role)}</small>`;
  const partyDot = v => party(v.party) ? `<span class="sw" style="background:${col(v.party)};border-radius:50%" data-tip="${esc(pName(v.party))} · lealtad ${pct(v.loyalty)}"></span>` : `<span class="muted">—</span>`;
  if (byParty(E)) {
    $("rollNote").textContent = `Posición de cada ${T().member} en los ejes (− primer polo, + segundo polo). Pulsa un nombre para editarlo.`;
    $("rollHead").innerHTML = `<tr><th>${esc(cap(T().member))}</th><th>Bloque</th><th class="c">Partido</th>${AX().map(a => `<th class="c" data-tip="${esc(`− ${a.a} · + ${a.b}`)}">${esc(a.k)}</th>`).join("")}</tr>`;
    const tint = m => `background:color-mix(in srgb, var(--brass) ${Math.round(Math.abs(m) * 3.5)}%, transparent)`;
    $("rollBody").innerHTML = rows.map(({ v, r }) => `<tr><td class="who">${who(v)}</td><td>${esc(v.bloc)}</td><td class="c"><span class="sw" style="background:${col(r.cls)};border-radius:50%" data-tip="${esc(labN(r.cls))}"></span></td>${v.pos.map((x, d) => `<td class="c num" style="${tint(x)}" data-tip="${esc(`${AX()[d].k}: ${x > 0 ? AX()[d].b : x < 0 ? AX()[d].a : "centro"} · peso ${v.w?.[d] ?? 1}`)}">${x > 0 ? "+" + x : x}</td>`).join("")}</tr>`).join("")
      || `<tr><td colspan="${3 + AX().length}" class="muted">Nadie coincide con el filtro.</td></tr>`;
    return;
  }
  $("rollNote").textContent = prop
    ? "Pulsa «Pacto» para forzar el voto de un miembro o de una lista entera en esta propuesta (sobornos, favores, órdenes)."
    : "Las listas aparecen como una sola fila. Pulsa un nombre para editar su ideología.";
  $("rollHead").innerHTML = `<tr><th>${esc(cap(T().member))}</th><th>Bloque</th><th class="c">Partido</th>${prop ? "" : `<th class="c">Compromiso</th>`}<th>${prop ? "P(Sí)" : "Inclinación"}</th><th>Resultado</th>${prop ? `<th class="c">Pacto</th>` : ""}</tr>`;
  $("rollBody").innerHTML = rows.map(({ v, r }) => {
    const n = v.kind !== "e" ? seatsOf(v.key) : 1;
    const pledge = prop ? "" : `<td class="c">${v.pledge && party(v.pledge) ? `<span class="chip">${sw(col(v.pledge))}${esc(pName(v.pledge))}</span>` : `<span class="muted">libre</span>`}</td>`;
    const p = r.prob;
    const bar = prop
      ? `<div class="row" style="flex-wrap:nowrap"><div class="pbar"><div style="left:${Math.min(50, p * 100)}%;width:${Math.abs(p - .5) * 100}%;background:${p >= .5 ? col("Y") : col("N")}"></div></div><span class="num">${pct(p)}</span></div>`
      : `<div class="row" style="flex-wrap:nowrap"><div class="pbar nomid"><div style="left:0;width:${p * 100}%;background:${col(r.top)}"></div></div><span class="num">${pct(p)} ${esc(pName(r.top))}</span></div>`;
    const res = `<span class="chip">${sw(col(r.cls))}${esc(prop ? LAB_P[r.cls] : labC(r.cls))}${n > 1 ? ` ×${n}` : ""}</span>${r.red ? ` <span class="flag" data-tip="Línea roja: ${esc(AX()[r.red.ax].k)}">⚑ línea roja</span>` : ""}${!prop && r.locked && r.model !== r.locked ? ` <span class="flag" data-tip="Su ideología le lleva a otro lado">grieta</span>` : ""}`;
    const ov = prop ? `<td class="c"><button class="ovb${r.ov ? " on" : ""}" data-ov="${esc(v.key)}">${r.ov ? (r.ov === "A" ? "Abst." : LAB_P[r.ov]) : "—"}</button></td>` : "";
    return `<tr><td class="who">${who(v)}</td><td>${esc(v.bloc)}</td><td class="c">${partyDot(v)}</td>${pledge}<td>${bar}</td><td>${res}</td>${ov}</tr>`;
  }).join("") || `<tr><td colspan="7" class="muted">Nadie coincide con el filtro.</td></tr>`;
}
function fillFilters(E) {
  const prop = curProp(), pm = st.mode === "none" || (!prop && st.election.kind === "direct");
  const fb = $("fBloc"), fr = $("fRes"), keepB = fb.value, keepR = fr.value;
  fb.innerHTML = `<option value="">Todos los bloques</option>` + blocNames(E.R).map(b => `<option>${esc(b)}</option>`).join("");
  fb.value = [...fb.options].some(o => o.value === keepB) ? keepB : "";
  const opts = pm ? ordC().map(k => [k, labN(k)])
    : prop ? [["Y", "Sí"], ["N", "No"], ["A", "En duda"]]
    : ordC().map(k => [k, k === "I" ? "Neutrales sin inclinación" : k.startsWith("L:") ? `Neutrales → ${candName(k.slice(2))}` : `${candName(k)} (comprometidos)`]);
  fr.innerHTML = `<option value="">${pm ? "Todos los partidos" : "Todos los resultados"}</option>` + opts.map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join("");
  fr.value = fr.dataset.mode === st.mode && opts.some(([k]) => k === keepR) ? keepR : "";
  fr.dataset.mode = st.mode;
}

/* ---------- Votación ---------- */
function fillMode() {
  const t = T(), direct = st.election.kind === "direct";
  $("mode").innerHTML = `<option value="none">Sin votación: solo bloques y posiciones</option>`
    + `<option value="cand">Elección de ${esc(t.office.toLowerCase())}${direct ? " (directa)" : ""}: ${esc(st.parties.map(p => p.cand).join(" · "))}</option>`
    + (st.proposals.length ? `<optgroup label="Propuestas">${st.proposals.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</optgroup>` : "");
  $("mode").value = st.mode;
  const p = curProp();
  $("modeNote").textContent = p ? p.desc : st.mode === "none" ? `${cap(t.members)} y bloques situados en los ejes, sin ninguna votación.`
    : direct ? `Elección directa por voto popular (${M.DIRECT_METHODS.find(m => m.id === st.election.direct)?.name.toLowerCase()}).`
    : "Los comprometidos votan a su candidato; el resto, por ideología y promesas.";
  $("clearMode").hidden = st.mode === "none";
}
function header() {
  const t = T();
  $("eyebrow").textContent = t.eyebrow; $("title").textContent = t.title; $("lede").textContent = t.lede;
  document.title = `${t.title} · Simulador electoral | Raldamain`;
}

/* ---------- Actualización general ---------- */
let lastProp = null, lastE = null;
function update() {
  const E = lastE = evaluate();
  const mk = (E.none ? "none" : E.prop ? E.prop.id : "cand") + st.election.kind;
  if (lastProp !== mk) { fillFilters(E); lastProp = mk; }
  board(E); insights(E); mapView(E); blocs(E); roll(E); updateDistricts(E); systemStats(E);
  store.set(KEY_CUR, st);
}

/* ---------- Editores de ejes compartidos ---------- */
function axRows(pos, w, prefix) {
  return AX().map((a, d) => `<div class="axrow${w ? " axw" : ""}"><span class="a">${esc(a.a)}</span><input type="range" min="-10" max="10" step="1" value="${pos[d]}" data-${prefix}="${d}" aria-label="${esc(a.a + " – " + a.b)}"><span class="b">${esc(a.b)}</span><span class="num" id="${prefix}v${d}">${pos[d]}</span>${w ? `<input type="number" min="0" max="5" step="0.25" value="${w[d]}" data-${prefix}w="${d}" aria-label="Peso de ${esc(a.k)}" title="Peso (relevancia) de este eje">` : ""}</div>`).join("");
}
const axOpts = sel => AX().map((a, d) => `<option value="${d}" ${d === sel ? "selected" : ""}>${esc(a.k)} · ${esc(a.a)} / ${esc(a.b)}</option>`).join("");
const partyOpts = (sel, extra) => (extra || "") + st.parties.map(p => `<option value="${esc(p.id)}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}</option>`).join("");

/* ---------- Diálogo: miembro designado o lista ---------- */
let dlgTarget = null;
function openDlg() { const dlg = $("dlg"); if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); } }
function openEditor(key) {
  if (key[0] === "e") {
    const obj = st.electors.find(e => "e" + e.id === key); if (!obj) return;
    dlgTarget = { key, obj, kind: "e" };
  } else if (key.startsWith("n:")) {
    const pid = key.slice(2), obj = st.natSlates[pid]; if (!obj) return;
    dlgTarget = { key, obj, kind: "n", side: pid };
  } else {
    const m = /^d(\d+):(.+)$/.exec(key); if (!m) return;
    const d = st.districts[+m[1]], obj = d?.slates[m[2]]; if (!obj) return;
    dlgTarget = { key, obj, kind: "s", d, side: m[2] };
  }
  renderDialog(); openDlg();
}
function redRows(red) {
  return (red || []).map((r, i) => `<div class="redrow"><select data-red="${i}" data-rf="ax">${axOpts(r.ax)}</select>
    <select data-red="${i}" data-rf="dir"><option value="1" ${r.dir > 0 ? "selected" : ""}>hacia ${esc(AX()[r.ax].b)}</option><option value="-1" ${r.dir < 0 ? "selected" : ""}>hacia ${esc(AX()[r.ax].a)}</option></select>
    <span class="muted">si se mueve ≥</span><input type="number" min="1" max="20" step="1" value="${r.t}" data-red="${i}" data-rf="t"><button data-redel="${i}" aria-label="Quitar línea roja">×</button></div>`).join("");
}
function renderDialog() {
  const { obj, kind, d, side } = dlgTarget, t = T();
  $("dlgTitle").textContent = kind === "e" ? obj.name : kind === "n" ? `${t.national} · ${pName(side)}` : `Lista ${pName(side)} · ${d.name}`;
  const blocList = [...new Set([...st.bodies, ...st.electors.map(e => e.bloc)])];
  let h = "";
  if (kind === "e") {
    h += `<div class="fgrid">
      <label class="field"><span>Nombre</span><input type="text" data-f="name" value="${esc(obj.name)}"></label>
      <label class="field"><span>Cargo</span><input type="text" data-f="role" value="${esc(obj.role)}"></label>
      <label class="field"><span>Bloque</span><input type="text" data-f="bloc" value="${esc(obj.bloc)}" list="blocDL"><datalist id="blocDL">${blocList.map(b => `<option value="${esc(b)}">`).join("")}</datalist></label>
      <label class="field"><span>Distrito</span><input type="text" data-f="dist" value="${esc(obj.dist)}"></label>
      <label class="field"><span>Partido</span><select data-f="party">${partyOpts(obj.party)}<option value="N" ${obj.party === "N" ? "selected" : ""}>Ninguno</option></select></label>
      <label class="field"><span>Compromiso de voto (${esc(t.office.toLowerCase())})</span><select data-f="pledge"><option value="" ${!obj.pledge ? "selected" : ""}>Libre</option>${st.parties.map(p => `<option value="${esc(p.id)}" ${obj.pledge === p.id ? "selected" : ""}>${esc(p.cand)} (${esc(p.name)})</option>`).join("")}</select></label>
      <label class="field wide"><span>Lealtad de partido · <b class="num" id="loyV">${pct(obj.loyalty)}</b></span><input type="range" min="0" max="1" step="0.05" value="${obj.loyalty}" data-f="loyalty"></label>
      <label class="field wide"><span>Notas</span><textarea data-f="note" style="min-height:60px;font-family:var(--font-body);font-size:13.5px">${esc(obj.note)}</textarea></label>
    </div>`;
  } else {
    const nSeats = kind === "n" ? (lastE?.ch.nSeats[side] || 0) + (lastE?.ch.bSeats[side] || 0) : d.el;
    h += `<div class="fgrid">
      <label class="field wide"><span>Lealtad de la lista · <b class="num" id="loyV">${pct(obj.loyalty)}</b></span><input type="range" min="0" max="1" step="0.05" value="${obj.loyalty}" data-f="loyalty"></label>
      <label class="field wide"><span>Nombres de la lista, en orden (uno por línea · ahora ${kind === "n" ? "obtiene" : "hay"} ${nSeats} escaños)</span><textarea data-f="names" style="min-height:140px">${esc(obj.names.join("\n"))}</textarea></label>
    </div>`;
  }
  h += `<div class="field"><span>Posición ideológica y peso de cada eje</span><div class="axed">${axRows(obj.pos, obj.w, "ep")}</div><div class="note">El peso (0–5) es cuánto le importa ese eje. 0 = le da igual; 3 = es su obsesión.</div></div>`;
  h += `<div class="field"><span>Líneas rojas</span><div id="reds" style="display:grid;gap:6px">${redRows(obj.red)}</div><div class="row"><button id="redAdd">Añadir línea roja</button><span class="note">Vota No a cualquier propuesta que mueva ese eje en esa dirección al menos el umbral.</span></div></div>`;
  if (kind === "e") h += `<div class="row"><button id="elDel">Eliminar ${esc(t.member)}</button></div>`;
  $("dlgBody").innerHTML = h;
}
$("dlgBody").addEventListener("input", e => {
  if (!dlgTarget) return;
  const { obj } = dlgTarget, t = e.target;
  if (t.dataset.f) {
    const f = t.dataset.f;
    if (f === "loyalty") { obj.loyalty = +t.value; $("loyV").textContent = pct(obj.loyalty); }
    else if (f === "names") obj.names = t.value.split("\n").map(s => s.trim()).filter(Boolean);
    else obj[f] = t.value;
    if (f === "name") $("dlgTitle").textContent = t.value;
  } else if (t.dataset.ep != null) { obj.pos[+t.dataset.ep] = +t.value; $("epv" + t.dataset.ep).textContent = t.value; }
  else if (t.dataset.epw != null) { obj.w[+t.dataset.epw] = Math.max(0, +t.value || 0); }
  else if (t.dataset.red != null) {
    const r = obj.red[+t.dataset.red], f = t.dataset.rf;
    r[f] = f === "t" ? Math.max(1, +t.value || 1) : +t.value;
    if (f === "ax") $("reds").innerHTML = redRows(obj.red);
  }
  update();
});
$("dlgBody").addEventListener("change", e => { if (e.target.dataset.f === "party" || e.target.dataset.f === "pledge" || e.target.dataset.f === "bloc") { lastProp = null; update(); } });
let delArmed = null;
$("dlgBody").addEventListener("click", e => {
  if (!dlgTarget) return;
  const { obj } = dlgTarget;
  if (e.target.id === "redAdd") { obj.red.push({ ax: 0, dir: 1, t: 3 }); $("reds").innerHTML = redRows(obj.red); update(); }
  const rd = e.target.closest("[data-redel]");
  if (rd) { obj.red.splice(+rd.dataset.redel, 1); $("reds").innerHTML = redRows(obj.red); update(); }
  if (e.target.id === "elDel") {
    if (!delArmed) { e.target.textContent = "¿Seguro? Pulsa otra vez"; delArmed = setTimeout(() => { delArmed = null; if ($("elDel")) $("elDel").textContent = `Eliminar ${T().member}`; }, 3000); return; }
    clearTimeout(delArmed); delArmed = null;
    st.electors = st.electors.filter(x => x !== obj);
    st.proposals.forEach(p => delete p.ov["e" + obj.id]);
    if (st.chair === "e" + obj.id) st.chair = "";
    $("dlg").close(); dlgTarget = null; lastProp = null; buildSystem(); update();
  }
});
$("dlgClose").addEventListener("click", () => $("dlg").close());
$("dlg").addEventListener("close", () => { dlgTarget = null; buildDistricts(); buildSystem(); update(); });
$("addEl").addEventListener("click", () => {
  const id = Math.max(0, ...st.electors.map(e => e.id)) + 1, n = AX().length;
  st.electors.push({ id, name: `Nuevo ${T().member}`, role: "Cargo", bloc: st.bodies[0] || "Designados", dist: "", party: "N", pledge: "", loyalty: 0, pos: Array(n).fill(0), w: Array(n).fill(1), red: [], note: "" });
  lastProp = null; update(); openEditor("e" + id);
});

/* ---------- Enlaces de edición en toda la página ---------- */
document.addEventListener("click", e => {
  const ed = e.target.closest("[data-edit]");
  if (ed && !e.target.closest("dialog")) { openEditor(ed.dataset.edit); return; }
  const ov = e.target.closest("[data-ov]");
  if (ov) {
    const p = curProp(); if (!p) return;
    const cyc = [undefined, "Y", "N", "A"], cur = p.ov[ov.dataset.ov];
    const nx = cyc[(cyc.indexOf(cur) + 1) % cyc.length];
    if (nx) p.ov[ov.dataset.ov] = nx; else delete p.ov[ov.dataset.ov];
    update();
  }
});

/* ---------- Sistema electoral ---------- */
const opt = (v, l, sel) => `<option value="${esc(v)}" ${String(v) === String(sel) ? "selected" : ""}>${esc(l)}</option>`;
const PR_METHODS = M.METHODS.filter(m => ["dhondt", "sainte", "msainte", "hare", "droop"].includes(m.id));
function buildSystem() {
  const s = st.system, n = s.national, el = st.election, t = T();
  $("sysSeats").innerHTML = `<h3>Reparto de escaños</h3>
    <label class="field"><span>Sistema de los distritos</span><select data-sys="method">${M.METHODS.map(m => opt(m.id, m.name, s.method)).join("")}</select></label>
    <div class="note" id="methodHint">${esc(M.METHODS.find(m => m.id === s.method)?.hint || "")}</div>
    <div class="inl">
      <label class="field"><span>Umbral (%)</span><input type="number" min="0" max="50" step="0.5" value="${s.threshold}" data-sys="threshold"></label>
      <label class="field"><span>Se mide</span><select data-sys="thresholdScope">${opt("district", "En cada distrito", s.thresholdScope)}${opt("national", "En todo el país", s.thresholdScope)}</select></label>
    </div>
    <label class="field"><span>Premio de mayoría (escaños extra al más votado)</span><input type="number" min="0" max="500" step="1" value="${s.bonus}" data-sys="bonus"></label>
    <h3 style="margin-top:6px">Nivel nacional</h3>
    <div class="inl">
      <label class="field"><span>Escaños</span><input type="number" min="0" max="1000" step="1" value="${n.seats}" data-nat="seats"></label>
      <label class="field"><span>Umbral nacional (%)</span><input type="number" min="0" max="50" step="0.5" value="${n.threshold}" data-nat="threshold"></label>
      <label class="field"><span>Método</span><select data-nat="method">${PR_METHODS.map(m => opt(m.id, m.short, n.method)).join("")}</select></label>
      <label class="field"><span>Tipo</span><select data-nat="mode">${opt("parallel", "Paralelo (aparte)", n.mode)}${opt("compensatory", "Compensatorio (corrige)", n.mode)}</select></label>
    </div>
    <div class="note">Paralelo: los escaños nacionales se reparten aparte, según el voto total. Compensatorio: van a quien los distritos dejaron por debajo de su proporción (como el sistema alemán).</div>`;
  const chairOpts = `<option value="">— nadie —</option>` + st.electors.map(e => opt("e" + e.id, `${e.name} (${e.role})`, st.chair)).join("");
  $("sysOffice").innerHTML = `<h3>Elección de ${esc(t.office.toLowerCase())}</h3>
    <label class="field"><span>Quién elige</span><select data-el="kind">${opt("indirect", `La cámara (${t.chamber})`, el.kind)}${opt("direct", "El pueblo (elección directa)", el.kind)}</select></label>
    ${el.kind === "direct" ? `<label class="field"><span>Sistema</span><select data-el="direct">${M.DIRECT_METHODS.map(m => opt(m.id, m.name, el.direct)).join("")}</select></label>
      <div class="note">${el.direct === "college" ? "Cada distrito da todos sus escaños de votos electorales al candidato más votado allí. Hace falta la mitad más uno." : "Se suman los votos de todos los distritos (habitantes × porcentaje)."}</div>`
    : `<label class="field"><span>Mayoría necesaria</span><select data-el="rule">${Object.entries(M.RULES).map(([k, l]) => opt(k, l, el.rule)).join("")}</select></label>
      <label class="field"><span>Si nadie la alcanza</span><select data-el="rounds">${opt("single", "Sin segunda vuelta (hace falta pactar)", el.rounds)}${opt("runoff", "Segunda vuelta entre los dos primeros", el.rounds)}</select></label>`}
    <label class="field"><span>Desempata (${esc(t.chairTitle)})</span><select data-chair="1">${chairOpts}</select></label>
    <div class="note">El desempate también decide las propuestas por mayoría simple con empate.</div>`;
  const dSum = st.districts.reduce((a, d) => a + (d.el | 0), 0);
  const per = st.districts.filter(d => d.el > 0 && d.pop > 0).map(d => d.pop / d.el);
  const ratio = per.length > 1 ? Math.max(...per) / Math.min(...per) : 1;
  $("sysHouse").innerHTML = `<h3>Tamaño de la cámara</h3>
    <div class="rnums">
      <span>Designados <b class="num">&nbsp;${st.electors.length}</b></span>
      <span>Distritos <b class="num">&nbsp;${dSum}</b></span>
      <span>Nacional <b class="num">&nbsp;${n.seats | 0}</b></span>
      ${s.bonus ? `<span>Premio <b class="num">&nbsp;${s.bonus}</b></span>` : ""}
      <span>Total <b class="num" id="houseTotal">&nbsp;${st.electors.length + dSum + (n.seats | 0) + (s.bonus | 0)}</b></span>
    </div>
    <div class="inl">
      <label class="field"><span>Escaños de distrito</span><input type="number" min="0" max="2000" step="1" value="${dSum}" id="appTotal"></label>
      <label class="field"><span>Mínimo por distrito</span><input type="number" min="0" max="50" step="1" value="1" id="appMin"></label>
    </div>
    <div class="row"><button id="apportion" class="primary">Repartir por población</button></div>
    <div class="note">Reparte los escaños de distrito en proporción a los habitantes (resto mayor). ${per.length > 1 ? `Ahora el voto en el distrito más favorecido vale <b>${fmtP(ratio)}</b> veces el del menos favorecido.` : ""}</div>
    <div class="note">Los designados se añaden o quitan en «Miembros».</div>`;
}
function systemStats(E) {
  const { ch } = E, ids = IDS(), N = E.R.length;
  const ix = M.indices(st, ch.total, ch.natShare);
  const whole = id => E.R.filter(x => x.v.party === id).length;
  const maj = Math.floor(N / 2) + 1, big = [...ids].sort((a, b) => whole(b) - whole(a))[0];
  $("sysStats").innerHTML = `<span>Desproporcionalidad <b>${fmtP(ix.gallagher, 2)}</b></span><span>NEP votos <b>${fmtP(ix.enpV, 2)}</b></span><span>NEP escaños <b>${fmtP(ix.enpS, 2)}</b></span>`
    + (big ? `<span>Mayor partido: ${esc(pName(big))} <b>${whole(big)}</b> de ${N} (mayoría ${maj})</span>` : "")
    + (ch.bonusTo ? `<span>Premio de mayoría: ${esc(pName(ch.bonusTo))} <b>+${ch.bSeats[ch.bonusTo]}</b></span>` : "");
  /* comparación de sistemas */
  const appointed = id => st.electors.filter(e => e.party === id).length;
  const rows = M.METHODS.map(m => {
    const c = M.chamber(st, m.id), x = M.indices(st, c.total, c.natShare);
    const tot = ids.reduce((a, id) => a + c.total[id], 0) + st.electors.length;
    const mj = Math.floor(tot / 2) + 1, winner = ids.find(id => c.total[id] + appointed(id) >= mj);
    return `<tr class="${m.id === st.system.method ? "cur" : ""}" data-sysm="${m.id}" style="cursor:pointer"><td class="m">${esc(m.short)}${m.id === st.system.method ? " ●" : ""}</td>${ids.map(id => `<td class="c num">${c.total[id]}</td>`).join("")}<td class="c num">${fmtP(x.gallagher, 1)}</td><td class="c num">${fmtP(x.enpS, 2)}</td><td>${winner ? `<span class="maj">${esc(pName(winner))}</span>` : `<span class="muted">nadie</span>`}</td></tr>`;
  });
  $("cmp").innerHTML = `<thead><tr><th>Sistema</th>${ids.map(id => `<th class="c">${sw(col(id), false)} ${esc(pName(id))}</th>`).join("")}<th class="c">Despr.</th><th class="c">NEP</th><th>Mayoría absoluta sola</th></tr></thead><tbody>${rows.join("")}</tbody>`;
  /* elección directa: vueltas */
  const D = E.direct || (st.election.kind === "direct" ? M.directElection(st, ch) : null);
  if (!D) { $("directBox").innerHTML = ""; return; }
  const head = D.method === "college" ? ["Voto popular", "Votos electorales"] : D.rounds.map((_, i) => D.method === "irv" ? `Ronda ${i + 1}` : `${i + 1}.ª vuelta`);
  const cell = (r, id) => { const V = Object.values(r).reduce((a, b) => a + b, 0); return r[id] == null ? `<td class="c out">—</td>` : `<td class="c num">${fmtN(r[id])} <span class="muted">${fmtP(V ? r[id] / V * 100 : 0)} %</span></td>`; };
  $("directBox").innerHTML = `<h3>Elección directa de ${esc(T().office.toLowerCase())}</h3><div class="tscroll"><table class="rounds"><thead><tr><th>Candidato</th>${head.map(h => `<th class="c">${esc(h)}</th>`).join("")}</tr></thead><tbody>${ids.map(id => `<tr><td>${sw(col(id))} ${esc(candName(id))} <span class="muted">· ${esc(pName(id))}</span>${D.win === id ? " <b>✓</b>" : ""}</td>${D.method === "college" ? `${cell(D.votes, id)}<td class="c num">${fmtP(D.ev[id])}</td>` : D.rounds.map(r => cell(r, id)).join("")}</tr>`).join("")}</tbody></table></div>`;
}
$("sysSeats").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.sys) { const k = t.dataset.sys; st.system[k] = ["threshold", "bonus"].includes(k) ? Math.max(0, +t.value || 0) : t.value; }
  else if (t.dataset.nat) { const k = t.dataset.nat; st.system.national[k] = ["seats", "threshold"].includes(k) ? Math.max(0, +t.value || 0) : t.value; }
  else return;
  lastProp = null; buildSystem(); buildDistricts(); update();
});
$("sysOffice").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.el) st.election[t.dataset.el] = t.value;
  else if (t.dataset.chair) st.chair = t.value;
  else return;
  lastProp = null; buildSystem(); fillMode(); update();
});
$("sysHouse").addEventListener("click", e => {
  if (e.target.id !== "apportion") return;
  M.apportion(st, Math.max(0, Math.round(+$("appTotal").value || 0)), Math.max(0, Math.round(+$("appMin").value || 0)));
  lastProp = null; buildSystem(); buildDistricts(); update();
});
$("cmp").addEventListener("click", e => {
  const r = e.target.closest("[data-sysm]"); if (!r) return;
  st.system.method = r.dataset.sysm; lastProp = null; buildSystem(); buildDistricts(); update();
});

/* ---------- Distritos ---------- */
function buildSwing() {
  $("dswing").innerHTML = `
    <div class="ctl"><label>Swing uniforme · <span class="num" id="swVal">${st.swing.pts} pts</span></label>
      <div class="row">
        <select id="swFrom" aria-label="Pierde votos">${partyOpts(st.swing.from)}</select><span class="muted">→</span>
        <select id="swTo" aria-label="Gana votos">${partyOpts(st.swing.to)}</select>
        <input type="range" id="swPts" min="0" max="30" step="1" value="${st.swing.pts}" aria-label="Puntos de swing">
      </div>
    </div>
    <div class="note">Mueve votos de un partido a otro en todos los distritos a la vez (también en los de voto ideológico).</div>`;
}
function buildDistricts() {
  buildSwing();
  $("dlist").innerHTML = st.districts.map((d, k) => {
    const ideo = d.mode === "ideo";
    const inputs = ideo
      ? `<div class="ideo">
          <div class="sl"><span class="lbl"><span>Participación</span></span><input type="range" min="0" max="100" value="${d.turnout}" data-dturn="${k}"><span class="num" id="dturn-${k}">${d.turnout}%</span></div>
          <div class="sl"><span class="lbl"><span>Dispersión</span></span><input type="range" min="0.5" max="10" step="0.5" value="${d.spread}" data-dspread="${k}"><span class="num" id="dspread-${k}">${d.spread}</span></div>
          ${AX().map((a, x) => `<div class="axrow"><span class="a">${esc(a.a)}</span><input type="range" min="-10" max="10" step="1" value="${d.center[x]}" data-dc="${k}" data-x="${x}" aria-label="Centro de ${esc(d.name)}: ${esc(a.k)}"><span class="b">${esc(a.b)}</span><span class="num" id="dc-${k}-${x}">${d.center[x]}</span></div>`).join("")}
        </div>`
      : `<div class="sliders">${st.parties.map(p => `<div class="sl"><span class="lbl">${sw(p.color, false)}<span>${esc(p.name)}</span></span><input type="range" min="0" max="100" value="${d.v[p.id] || 0}" data-dv="${k}" data-p="${esc(p.id)}" style="accent-color:${p.color}" aria-label="Voto ${esc(p.name)} en ${esc(d.name)}"><span class="num" id="dv-${k}-${esc(p.id)}">${d.v[p.id] || 0}</span></div>`).join("")}</div>`;
    return `<div class="drow">
    <div class="dname">
      <input type="text" value="${esc(d.name)}" data-dn="${k}" aria-label="Nombre del distrito" class="dtitle">
      <span class="el"><label>Escaños</label><input type="number" min="0" max="1000" value="${d.el}" data-de="${k}"></span>
      <span class="el"><label>Habitantes</label><input class="pop" type="number" min="0" step="1000" value="${d.pop}" data-dp="${k}"></span>
      <span class="per" id="dper-${k}"></span>
      <div class="dctl"><span class="seg"><button data-dmode="${k}" data-m="manual" class="${ideo ? "" : "on"}">A mano</button><button data-dmode="${k}" data-m="ideo" class="${ideo ? "on" : ""}">Ideológico</button></span></div>
      <div class="dctl"><select data-dsys="${k}" aria-label="Sistema de ${esc(d.name)}"><option value="">Sistema de la cámara (${esc(methodName(st.system.method))})</option>${M.METHODS.map(m => opt(m.id, m.short, d.system || "")).join("")}</select></div>
      <span id="dchip-${k}"></span>
    </div>
    ${inputs}
    <div class="dout">
      <div class="dbar" id="dbar-${k}"></div>
      <div class="dmeta" id="dmeta-${k}"></div>
      <div class="row"><span class="note">Editar lista:</span>${st.parties.map(p => `<button class="mini" data-ds="${k}" data-p="${esc(p.id)}">${sw(p.color)}${esc(p.name)}</button>`).join("")}</div>
      <div class="row"><button class="mini" data-ddel="${k}">Eliminar distrito</button></div>
    </div>
  </div>`;
  }).join("") || `<div class="note">No hay distritos: la cámara es solo de ${esc(T().members)} designados.</div>`;
}
function updateDistricts(E) {
  const ids = IDS(), { ch } = E;
  ch.dres.forEach((res, k) => {
    const d = st.districts[k], e = res.e, p = d.pop || 0;
    if (d.mode !== "ideo") ids.forEach(id => { const el = $(`dv-${k}-${id}`); if (el) el.textContent = d.v[id] || 0; });
    const bar = $(`dbar-${k}`); if (!bar) return;
    bar.innerHTML = [...ids, "I"].map(id => `<div style="width:${e[id]}%;background:${col(id)}" data-tip="${esc(`${id === "I" ? "Abstención / indecisos" : pName(id)} ${fmtP(e[id])}%`)}"></div>`).join("");
    $(`dchip-${k}`).innerHTML = res.winners.length ? res.winners.map(id => `<span class="chip">${sw(col(id))}${esc(pName(id))} ${res.seatsBy[id]}</span>`).join(" ")
      : `<span class="chip">${sw(col("I"))}Sin escaños</span>`;
    const second = res.ranked[1];
    let how = "";
    if (res.method === "wta" && res.tied?.length > 1) how = ` · empate: reparto por turnos`;
    else if (res.method === "wta" && second) how = ` · a ${esc(pName(second))} le faltan ${fmtP(res.margin / 2 + .05)} pts`;
    if (res.rounds?.length > 1) { const r2 = res.rounds[1], [a, b] = Object.keys(r2), V = r2[a] + r2[b]; how = ` · 2.ª vuelta ${esc(pName(a))} ${fmtP(r2[a] / V * 100)} % – ${esc(pName(b))} ${fmtP(r2[b] / V * 100)} %`; }
    $(`dmeta-${k}`).innerHTML = `${esc(methodName(res.method))} · ${ids.map(id => `${esc(pName(id))} ${fmtP(e[id])}`).join(" / ")} · abst. ${fmtP(e.I)}%${how}`
      + `<br>${ids.map(id => `<span class="num">${fmtN(p * e[id] / 100)}</span> ${esc(pName(id).toLowerCase())}`).join(" · ")}`;
    $(`dper-${k}`).textContent = d.el ? `1 escaño cada ${fmtN(p / d.el)} hab.` : "sin escaños";
  });
  const pv = ch.pv, P = [...ids, "I"].reduce((a, id) => a + pv[id], 0), dec = P - pv.I;
  const elected = Object.fromEntries(ids.map(id => [id, ch.total[id]])), S = ids.reduce((a, id) => a + elected[id], 0);
  const bar = (t, n, withI) => `<div class="dbar">${[...ids, ...(withI ? ["I"] : [])].map(id => `<div style="width:${n ? (t[id] || 0) / n * 100 : 0}%;background:${col(id)}" data-tip="${esc(`${id === "I" ? "Abstención" : pName(id)}: ${fmtN(t[id] || 0)}`)}"></div>`).join("")}</div>`;
  const line = (t, n, withI) => `<div class="rnums">${[...ids, ...(withI ? ["I"] : [])].map(id => `<span>${sw(col(id), false)}<span class="num">${fmtN(t[id] || 0)}</span> <span class="muted">${n ? fmtP((t[id] || 0) / n * 100) + "%" : "—"}</span></span>`).join("")}</div>`;
  const nat = st.system.national.seats | 0;
  $("popvote").innerHTML = `
    <div class="rcard"><div class="lab">Voto popular · ${fmtN(P)} habitantes</div>${bar(pv, P, true)}${line(pv, P, true)}
      <div class="note">Entre votos válidos: ${ids.map(id => `${esc(pName(id))} ${fmtP(dec ? pv[id] / dec * 100 : 0)}%`).join(" · ")}.</div></div>
    <div class="rcard"><div class="lab">Escaños elegidos · ${S}</div>${bar(elected, S, false)}${line(elected, S, false)}
      <div class="note">Distritos: ${ids.map(id => `${esc(pName(id))} ${ch.dSeats[id]}`).join(" · ")}${nat ? ` · nacional (${st.system.national.mode === "compensatory" ? "compensatorio" : "paralelo"}): ${ids.map(id => `${esc(pName(id))} ${ch.nSeats[id]}`).join(" · ")}` : ""}${ch.bonusTo ? ` · premio: ${esc(pName(ch.bonusTo))} +${ch.bSeats[ch.bonusTo]}` : ""}.</div></div>`;
}
$("dswing").addEventListener("input", e => {
  if (e.target.id === "swPts") { st.swing.pts = +e.target.value; $("swVal").textContent = `${st.swing.pts} pts`; update(); }
});
$("dswing").addEventListener("change", e => {
  if (e.target.id === "swFrom") { st.swing.from = e.target.value; update(); }
  if (e.target.id === "swTo") { st.swing.to = e.target.value; update(); }
});
$("dlist").addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.dn != null) { st.districts[+t.dataset.dn].name = t.value; lastProp = null; update(); return; }
  if (t.dataset.de != null) { st.districts[+t.dataset.de].el = Math.max(0, Math.min(1000, Math.round(+t.value || 0))); buildSystem(); update(); return; }
  if (t.dataset.dp != null) { st.districts[+t.dataset.dp].pop = Math.max(0, Math.round(+t.value || 0)); update(); return; }
  if (t.dataset.dturn != null) { const d = st.districts[+t.dataset.dturn]; d.turnout = +t.value; $(`dturn-${t.dataset.dturn}`).textContent = d.turnout + "%"; update(); return; }
  if (t.dataset.dspread != null) { const d = st.districts[+t.dataset.dspread]; d.spread = +t.value; $(`dspread-${t.dataset.dspread}`).textContent = d.spread; update(); return; }
  if (t.dataset.dc != null) { const k = +t.dataset.dc, x = +t.dataset.x; st.districts[k].center[x] = +t.value; $(`dc-${k}-${x}`).textContent = t.value; update(); return; }
  if (t.dataset.dv != null) {
    const k = +t.dataset.dv, d = st.districts[k], id = t.dataset.p;
    d.v[id] = +t.value;
    const others = IDS().filter(x => x !== id), sum = IDS().reduce((a, x) => a + (d.v[x] || 0), 0);
    if (sum > 100) { /* recorta a los demás partidos en proporción para no pasar del 100 % */
      const excess = sum - 100, tot = others.reduce((a, x) => a + (d.v[x] || 0), 0);
      others.forEach(x => { const cut = tot ? Math.round(excess * (d.v[x] || 0) / tot) : 0; d.v[x] = Math.max(0, (d.v[x] || 0) - cut); });
      let over = IDS().reduce((a, x) => a + d.v[x], 0) - 100;
      for (const x of others) { if (over <= 0) break; const c = Math.min(over, d.v[x]); d.v[x] -= c; over -= c; }
      others.forEach(x => { const inp = $("dlist").querySelector(`[data-dv="${k}"][data-p="${CSS.escape(x)}"]`); if (inp) inp.value = d.v[x]; });
    }
    update();
  }
});
$("dlist").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.dsys != null) { const d = st.districts[+t.dataset.dsys]; if (t.value) d.system = t.value; else delete d.system; update(); }
  if (t.dataset.dn != null) buildSystem();
});
let ddelArmed = null;
$("dlist").addEventListener("click", e => {
  const s = e.target.closest("[data-ds]");
  if (s) { openEditor(`d${s.dataset.ds}:${s.dataset.p}`); return; }
  const m = e.target.closest("[data-dmode]");
  if (m) {
    const d = st.districts[+m.dataset.dmode];
    if (m.dataset.m === "ideo" && d.mode !== "ideo") {   /* el centro sale de las listas, pesado por el voto */
      const ids = IDS(), tot = ids.reduce((a, id) => a + (d.v[id] || 0), 0);
      if (tot) d.center = AX().map((_, x) => Math.round(ids.reduce((a, id) => a + (d.v[id] || 0) * d.slates[id].pos[x], 0) / tot));
      d.turnout = Math.round(tot) || d.turnout;
    }
    if (m.dataset.m === "manual" && d.mode === "ideo") { const e2 = M.ideoShares(st, d); IDS().forEach(id => { d.v[id] = Math.round(e2[id] || 0); }); }
    d.mode = m.dataset.m; buildDistricts(); update(); return;
  }
  const del = e.target.closest("[data-ddel]");
  if (del) {
    const k = +del.dataset.ddel;
    if (ddelArmed !== k) { ddelArmed = k; del.textContent = "¿Seguro? Pulsa otra vez"; setTimeout(() => { if (ddelArmed === k) { ddelArmed = null; buildDistricts(); update(); } }, 3000); return; }
    ddelArmed = null;
    st.districts.splice(k, 1);
    st.proposals.forEach(p => {   /* los pactos van por índice de distrito */
      const ov = {};
      Object.entries(p.ov).forEach(([key, val]) => {
        const mm = /^d(\d+):(.+)$/.exec(key);
        if (!mm) ov[key] = val;
        else if (+mm[1] < k) ov[key] = val;
        else if (+mm[1] > k) ov[`d${+mm[1] - 1}:${mm[2]}`] = val;
      });
      p.ov = ov;
    });
    lastProp = null; buildDistricts(); buildSystem(); update();
  }
});
$("addDist").addEventListener("click", () => {
  const n = AX().length, slates = {}, v = {};
  st.parties.forEach(p => { slates[p.id] = M.newSlate(st, p.pos); v[p.id] = 0; });
  st.districts.push({ name: `Distrito ${st.districts.length + 1}`, el: 1, pop: 10000, v, slates, mode: "manual", center: Array(n).fill(0), spread: 4, turnout: 70 });
  lastProp = null; buildDistricts(); buildSystem(); update();
});

/* ---------- Propuestas ---------- */
function buildProps() {
  $("plist").innerHTML = st.proposals.map(p => `<button class="${p.id === st.editP ? "on" : ""}" data-pe="${esc(p.id)}">${esc(p.name)}</button>`).join("")
    + `<button data-pnew="1">+ Nueva propuesta</button>`;
  const p = st.proposals.find(x => x.id === st.editP);
  if (!p) { $("pedit").innerHTML = `<div class="note">No hay propuestas.</div>`; return; }
  $("pedit").innerHTML = `<div class="fgrid">
      <label class="field"><span>Nombre</span><input type="text" data-pf="name" value="${esc(p.name)}"></label>
      <label class="field"><span>Promotor</span><select data-pf="sponsor">${partyOpts(p.sponsor, `<option value="" ${!p.sponsor ? "selected" : ""}>Ninguno</option>`)}</select></label>
      <label class="field wide"><span>Descripción</span><input type="text" data-pf="desc" value="${esc(p.desc)}"></label>
      <label class="field"><span>Regla de aprobación</span><select data-pf="rule">${Object.entries(M.RULES).map(([k, l]) => opt(k, l, p.rule)).join("")}</select></label>
      <div class="field"><span>Promesa de campaña</span><div class="row">${st.parties.map(q => `<label class="row" style="gap:4px"><input type="checkbox" data-pp="${esc(q.id)}" ${p.promise[q.id] ? "checked" : ""}> ${esc(q.cand)}</label>`).join("")}</div></div>
    </div>
    <div class="field" style="margin-top:14px"><span>Qué cambia (marca los ejes que toca)</span><div class="axed">${AX().map((a, d) => {
      const on = p.t[d] != null, v = on ? p.t[d] : st.sq[d];
      return `<div class="axrow axp${on ? "" : " off"}"><input type="checkbox" data-pon="${d}" ${on ? "checked" : ""} aria-label="Afecta a ${esc(a.k)}"><span class="a">${esc(a.a)}</span><input type="range" min="-10" max="10" step="1" value="${v}" data-pt="${d}" ${on ? "" : "disabled"} aria-label="${esc(a.a + " – " + a.b)}"><span class="b">${esc(a.b)}</span><span class="num" id="ptv${d}">${on ? `${st.sq[d]} → ${v}` : "—"}</span></div>`;
    }).join("")}</div></div>
    <div class="row" style="margin-top:14px">
      <button data-pvote="1">Ver esta votación</button>
      <button data-pdup="1">Duplicar</button>
      <button data-pclr="1">Quitar pactos (${Object.keys(p.ov).length})</button>
      <button data-pdel="1" id="pdel">Borrar propuesta</button>
    </div>`;
}
const editP = () => st.proposals.find(x => x.id === st.editP);
$("pedit").addEventListener("input", e => {
  const p = editP(), t = e.target; if (!p) return;
  if (t.dataset.pf) { p[t.dataset.pf] = t.value; if (t.dataset.pf === "name") { const b = $("plist").querySelector(".on"); if (b) b.textContent = t.value; } if (t.dataset.pf === "name" || t.dataset.pf === "desc") fillMode(); }
  if (t.dataset.pt != null) { const d = +t.dataset.pt; p.t[d] = +t.value; $("ptv" + d).textContent = `${st.sq[d]} → ${t.value}`; }
  update();
});
$("pedit").addEventListener("change", e => {
  const p = editP(), t = e.target; if (!p) return;
  if (t.dataset.pp) { p.promise[t.dataset.pp] = t.checked; update(); }
  if (t.dataset.pon != null) { const d = +t.dataset.pon; p.t[d] = t.checked ? st.sq[d] : null; buildProps(); update(); }
});
let pdelArmed = null;
$("pedit").addEventListener("click", e => {
  const p = editP(); if (!p) return;
  if (e.target.dataset.pvote) { st.mode = p.id; fillMode(); update(); $("mode").scrollIntoView?.({ behavior: "smooth", block: "center" }); }
  if (e.target.dataset.pdup) { const c = clone(p); c.id = "p" + Date.now().toString(36); c.name += " (copia)"; st.proposals.push(c); st.editP = c.id; buildProps(); fillMode(); }
  if (e.target.dataset.pclr) { p.ov = {}; buildProps(); update(); }
  if (e.target.dataset.pdel) {
    if (!pdelArmed) { e.target.textContent = "¿Seguro? Pulsa otra vez"; pdelArmed = setTimeout(() => { pdelArmed = null; if ($("pdel")) $("pdel").textContent = "Borrar propuesta"; }, 3000); return; }
    clearTimeout(pdelArmed); pdelArmed = null;
    st.proposals = st.proposals.filter(x => x !== p);
    if (st.mode === p.id) st.mode = "cand";
    st.editP = st.proposals[0]?.id; buildProps(); fillMode(); update();
  }
});
$("plist").addEventListener("click", e => {
  const b = e.target.closest("[data-pe]");
  if (b) { st.editP = b.dataset.pe; buildProps(); }
  if (e.target.closest("[data-pnew]")) {
    const id = "p" + Date.now().toString(36);
    const np = { id, name: "Nueva propuesta", desc: "", sponsor: "", rule: "abs", t: Array(AX().length).fill(null), promise: {}, ov: {} };
    st.parties.forEach(q => { np.promise[q.id] = false; });
    st.proposals.push(np); st.editP = id; buildProps(); fillMode();
  }
});
$("mode").addEventListener("change", e => {
  st.mode = e.target.value;
  if (st.mode !== "cand" && st.mode !== "none") { st.editP = st.mode; buildProps(); }
  fillMode(); update();
});
$("clearMode").addEventListener("click", () => { st.mode = "none"; fillMode(); update(); });

/* ---------- Partidos y candidatos ---------- */
function buildParties() {
  $("partyList").innerHTML = st.parties.map((p, i) => `<div class="prow" style="grid-template-columns:44px minmax(0,1fr) minmax(0,1fr) 90px auto">
    <input type="color" value="${esc(p.color)}" data-pc="${i}" aria-label="Color de ${esc(p.name)}">
    <label class="field"><span>Partido</span><input type="text" value="${esc(p.name)}" data-pn="${i}"></label>
    <label class="field"><span>Candidato</span><input type="text" value="${esc(p.cand)}" data-pk="${i}"></label>
    <label class="field"><span>Atractivo</span><input type="number" min="-5" max="5" step="0.1" value="${p.appeal || 0}" data-pa="${i}" title="Votos extra en los distritos de voto ideológico"></label>
    <div class="row prow-btns">
      <button data-pmove="${i}" data-d="-1" ${i === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
      <button data-pmove="${i}" data-d="1" ${i === st.parties.length - 1 ? "disabled" : ""} aria-label="Bajar">↓</button>
      <button data-edit="n:${esc(p.id)}" title="Ideología y nombres de su lista nacional">Lista nacional</button>
      <button data-pdelp="${i}" ${st.parties.length <= 2 ? "disabled" : ""}>Eliminar</button>
    </div>
  </div>`).join("");
  const pick = $("candPick"), keep = pick.value;
  pick.innerHTML = st.parties.map(p => `<option value="${esc(p.id)}">${esc(p.cand)} (${esc(p.name)})</option>`).join("") + `<option value="SQ">Statu quo</option>`;
  pick.value = [...pick.options].some(o => o.value === keep) ? keep : st.parties[0].id;
  buildCandAx();
}
function buildCandAx() {
  const k = $("candPick").value, pos = k === "SQ" ? st.sq : party(k).pos;
  $("candAx").innerHTML = axRows(pos, null, "cp");
}
function partiesChanged() { lastProp = null; buildParties(); buildDistricts(); buildProps(); buildSystem(); fillMode(); update(); }
$("candPick").addEventListener("change", buildCandAx);
$("candAx").addEventListener("input", e => {
  const d = e.target.dataset.cp; if (d == null) return;
  const k = $("candPick").value, pos = k === "SQ" ? st.sq : party(k).pos;
  pos[+d] = +e.target.value; $("cpv" + d).textContent = e.target.value;
  if (k === "SQ") buildProps();
  update();
});
$("partyList").addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.pn != null) st.parties[+t.dataset.pn].name = t.value;
  else if (t.dataset.pk != null) st.parties[+t.dataset.pk].cand = t.value;
  else if (t.dataset.pc != null) st.parties[+t.dataset.pc].color = t.value;
  else if (t.dataset.pa != null) st.parties[+t.dataset.pa].appeal = +t.value || 0;
  else return;
  lastProp = null; fillMode(); update();
});
$("partyList").addEventListener("change", e => { if (["pn", "pk", "pc"].some(k => e.target.dataset[k] != null)) partiesChanged(); });
let pdelpArmed = null;
$("partyList").addEventListener("click", e => {
  const mv = e.target.closest("[data-pmove]"), del = e.target.closest("[data-pdelp]");
  if (mv) {
    const i = +mv.dataset.pmove, j = i + +mv.dataset.d;
    if (j < 0 || j >= st.parties.length) return;
    [st.parties[i], st.parties[j]] = [st.parties[j], st.parties[i]]; partiesChanged();
  }
  if (del && st.parties.length > 2) {
    if (pdelpArmed !== del.dataset.pdelp) { pdelpArmed = del.dataset.pdelp; del.textContent = "¿Seguro?"; setTimeout(() => { if (pdelpArmed === del.dataset.pdelp) { pdelpArmed = null; buildParties(); } }, 3000); return; }
    pdelpArmed = null;
    const id = st.parties[+del.dataset.pdelp].id;
    st.parties = st.parties.filter(p => p.id !== id);
    st.electors.forEach(x => { if (x.party === id) x.party = "N"; if (x.pledge === id) x.pledge = ""; });
    st.districts.forEach(d => { delete d.v[id]; delete d.slates[id]; });
    delete st.natSlates[id];
    st.proposals.forEach(p => { if (p.sponsor === id) p.sponsor = ""; delete p.promise[id]; Object.keys(p.ov).forEach(k => { if (k.endsWith(":" + id)) delete p.ov[k]; }); });
    if (st.swing.from === id || st.swing.to === id) st.swing = { from: st.parties[0].id, to: st.parties[1].id, pts: 0 };
    partiesChanged();
  }
});
$("addParty").addEventListener("click", () => {
  let id; do { id = "P" + Math.random().toString(36).slice(2, 6).toUpperCase(); } while (party(id) || M.RESERVED.includes(id));
  const color = M.PALETTE.find(c => !st.parties.some(p => p.color.toLowerCase() === c)) || "#777777";
  const np = { id, name: "Nuevo partido", cand: "Nuevo candidato", color, pos: [...st.sq], appeal: 0 };
  st.parties.push(np);
  st.districts.forEach(d => { d.v[id] = 0; d.slates[id] = M.newSlate(st, np.pos); });
  st.natSlates[id] = M.newSlate(st, np.pos);
  st.proposals.forEach(p => { p.promise[id] = false; });
  partiesChanged();
  $("candPick").value = id; buildCandAx();
});

/* ---------- Ejes y textos de la cámara ---------- */
function buildAxes() {
  const n = AX().length;
  $("axList").innerHTML = AX().map((a, d) => `<div class="axedit">
      <input type="text" value="${esc(a.k)}" data-axk="${d}" maxlength="6" aria-label="Sigla del eje" title="Sigla (corta)">
      <input type="text" value="${esc(a.a)}" data-axa="${d}" aria-label="Primer polo (−10)" title="Primer polo (−10)">
      <input type="text" value="${esc(a.b)}" data-axb="${d}" aria-label="Segundo polo (+10)" title="Segundo polo (+10)">
      <div class="row" style="flex-wrap:nowrap">
        <button data-axmove="${d}" data-d="-1" ${d === 0 ? "disabled" : ""} aria-label="Subir">↑</button>
        <button data-axmove="${d}" data-d="1" ${d === n - 1 ? "disabled" : ""} aria-label="Bajar">↓</button>
        <button data-axdel="${d}" ${n <= 1 ? "disabled" : ""} aria-label="Quitar eje">×</button>
      </div>
    </div>`).join("");
  const t = T(), f = (k, l, wide) => `<label class="field${wide ? " wide" : ""}"><span>${esc(l)}</span><input type="text" data-meta="${k}" value="${esc(t[k])}"></label>`;
  $("metaForm").innerHTML = f("title", "Título", true) + f("eyebrow", "Antetítulo", true)
    + `<label class="field wide"><span>Descripción</span><textarea data-meta="lede" style="min-height:70px;font-family:var(--font-body);font-size:13.5px">${esc(t.lede)}</textarea></label>`
    + f("chamber", "Nombre de la cámara") + f("office", "Cargo que se elige") + f("chairTitle", "Quién preside")
    + f("member", "Un miembro se llama") + f("members", "Plural") + f("national", "Lista nacional se llama")
    + `<label class="field wide"><span>Grupos de designados (uno por línea, en orden)</span><textarea data-bodies="1" style="min-height:90px;font-family:var(--font-body);font-size:13.5px">${esc(st.bodies.join("\n"))}</textarea></label>`;
}
$("axList").addEventListener("change", e => {
  const t = e.target, f = ["axk", "axa", "axb"].find(k => t.dataset[k] != null); if (!f) return;
  const d = +t.dataset[f]; AX()[d][{ axk: "k", axa: "a", axb: "b" }[f]] = t.value.trim() || AX()[d][{ axk: "k", axa: "a", axb: "b" }[f]];
  rebuild();
});
let axdelArmed = null;
$("axList").addEventListener("click", e => {
  const mv = e.target.closest("[data-axmove]"), del = e.target.closest("[data-axdel]");
  if (mv) { M.moveAxis(st, +mv.dataset.axmove, +mv.dataset.axmove + +mv.dataset.d); rebuild(); }
  if (del) {
    const d = +del.dataset.axdel;
    if (axdelArmed !== d) { axdelArmed = d; del.textContent = "¿Seguro?"; setTimeout(() => { if (axdelArmed === d) { axdelArmed = null; buildAxes(); } }, 3000); return; }
    axdelArmed = null; M.removeAxis(st, d); rebuild();
  }
});
$("addAxis").addEventListener("click", () => { M.addAxis(st, { k: "E" + (AX().length + 1), a: "Polo A", b: "Polo B" }); rebuild(); });
$("metaForm").addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.meta) { st.meta[t.dataset.meta] = t.value; header(); store.set(KEY_CUR, st); }
  if (t.dataset.bodies) { st.bodies = t.value.split("\n").map(s => s.trim()).filter(Boolean); store.set(KEY_CUR, st); }
});
$("metaForm").addEventListener("change", () => { lastProp = null; fillMode(); buildSystem(); update(); });

/* ---------- Parámetros ---------- */
const PARAMS = [
  ["k", "Nitidez", 0.5, 6, 0.1, "Cuánto decide la ideología en la cámara. Bajo = votos más inciertos."],
  ["cue", "Fuerza de partido", 0, 3, 0.1, "Cuánto arrastra la disciplina de partido (multiplicada por la lealtad)."],
  ["cred", "Credibilidad de las promesas", 0, 1.5, 0.05, "Cuánto cuentan las promesas de campaña al elegir el cargo."],
  ["rl", "Castigo por línea roja", 0, 8, 0.5, "Lo que pierde un candidato ante un miembro si promete algo que cruza su línea roja."],
  ["band", "Margen de duda", 0, 0.4, 0.01, "Si el favorito no saca esta ventaja (×2) al segundo, el miembro cuenta como neutral sin inclinación."],
  ["vk", "Nitidez del voto popular", 0.2, 5, 0.1, "Distritos de voto ideológico: cuánto vota la gente al partido más cercano (alto) o se reparte (bajo)."],
  ["tk", "Afinidad de las transferencias", 0, 5, 0.1, "Segunda vuelta, voto alternativo y STV: alto = los votos van casi todos al partido más cercano."],
  ["exhaust", "Votos que no se transfieren", 0, 1, 0.05, "La parte de los votos de un eliminado que se pierde (abstención en segunda vuelta)."]
];
function buildParams() {
  $("params").innerHTML = PARAMS.map(([k, l, mn, mx, s, h]) => `<label class="field"><span>${esc(l)} · <b class="num" id="parv-${k}">${st.params[k]}</b></span><input type="range" min="${mn}" max="${mx}" step="${s}" value="${st.params[k]}" data-par="${k}"><span class="note" style="text-transform:none;letter-spacing:0">${esc(h)}</span></label>`).join("")
    + `<label class="field"><span>Compromisos</span><label class="row" style="gap:6px;text-transform:none;letter-spacing:0;font-size:14px;color:var(--ink)"><input type="checkbox" id="honor" ${st.params.honor ? "checked" : ""}> Respetar compromisos de voto</label><span class="note">Desmárcalo para ver la elección «solo por ideología».</span></label>`;
}
$("params").addEventListener("input", e => {
  const k = e.target.dataset.par;
  if (k) { st.params[k] = +e.target.value; $("parv-" + k).textContent = e.target.value; update(); }
  if (e.target.id === "honor") { st.params.honor = e.target.checked; update(); }
});

/* ---------- Mapa, filtros ---------- */
function buildAxSel() { $("axX").innerHTML = axOpts(st.axX); $("axY").innerHTML = axOpts(st.axY); $("mapLab").value = st.mapLab || "surname"; $("mapDist").value = st.mapDist || ""; }
$("axX").addEventListener("change", e => { st.axX = +e.target.value; update(); });
$("axY").addEventListener("change", e => { st.axY = +e.target.value; update(); });
$("mapLab").addEventListener("change", e => { st.mapLab = e.target.value; update(); });
$("mapDist").addEventListener("change", e => { st.mapDist = e.target.value; update(); });
for (const id of ["fBloc", "fRes"]) $(id).addEventListener("change", update);
$("fText").addEventListener("input", update);

/* ---------- Escenarios y datos ---------- */
function rebuild() { lastProp = null; header(); fillMode(); buildParties(); buildDistricts(); buildProps(); buildParams(); buildAxSel(); buildAxes(); buildSystem(); update(); }
function load(o) { st = M.normalize(o); rebuild(); }
async function loadPreset(id) {
  const p = presets.find(x => x.id === id); if (!p) return false;
  try {
    const r = await fetch(PRESET_DIR + p.file, { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    load(await r.json());
    $("presetNote").textContent = p.desc;
    return true;
  } catch (err) { $("presetNote").textContent = `No se pudo cargar «${p.name}» (${err.message}).`; return false; }
}
function blank() {
  return {
    meta: { ...M.DEFAULT_META, title: "Cámara nueva", eyebrow: "Simulador electoral", lede: "Una cámara en blanco: añade ejes, partidos, distritos y miembros designados." },
    axes: [{ k: "ECO", a: "Mercado", b: "Estado" }, { k: "SOC", a: "Libertad", b: "Autoridad" }], sq: [0, 0],
    parties: [{ id: "A", name: "Partido A", cand: "Candidata A", color: "#2a78d6", pos: [-4, -2] }, { id: "B", name: "Partido B", cand: "Candidato B", color: "#c0392b", pos: [4, 3] }],
    electors: [], districts: [{ name: "Distrito 1", el: 10, pop: 100000, v: { A: 45, B: 40 }, slates: {}, mode: "manual" }],
    proposals: [], system: { method: "dhondt" }, mode: "none", axX: 0, axY: 1
  };
}
let blankArmed = null;
$("blank").addEventListener("click", () => {
  const b = $("blank");
  if (!blankArmed) { b.textContent = "¿Seguro? Pulsa otra vez"; blankArmed = setTimeout(() => { blankArmed = null; b.textContent = "Empezar en blanco"; }, 3000); return; }
  clearTimeout(blankArmed); blankArmed = null; b.textContent = "Empezar en blanco";
  load(blank());
});
$("presetLoad").addEventListener("click", () => loadPreset($("presetSel").value));
$("presetSel").addEventListener("change", () => { $("presetNote").textContent = presets.find(x => x.id === $("presetSel").value)?.desc || ""; });
function scenarios() { return store.get(KEY_SC) || {}; }
function renderScenarios() {
  const sc = scenarios(), names = Object.keys(sc);
  $("slist").innerHTML = names.length ? names.map(n => `<span class="item"><button data-load="${esc(n)}">${esc(n)}</button><button data-del="${esc(n)}" aria-label="Borrar ${esc(n)}">×</button></span>`).join("")
    : `<span class="note">Aún no hay escenarios guardados.</span>`;
}
$("scenSave").addEventListener("click", () => {
  const n = $("scenName").value.trim() || `Escenario ${Object.keys(scenarios()).length + 1}`;
  const sc = scenarios(); sc[n] = clone(st); store.set(KEY_SC, sc); $("scenName").value = ""; renderScenarios();
});
$("slist").addEventListener("click", e => {
  const l = e.target.closest("[data-load]"), d = e.target.closest("[data-del]"), sc = scenarios();
  if (l && sc[l.dataset.load]) load(clone(sc[l.dataset.load]));
  if (d) { delete sc[d.dataset.del]; store.set(KEY_SC, sc); renderScenarios(); }
});
$("jsonCopy").addEventListener("click", () => {
  const txt = JSON.stringify(st, null, 2), ta = $("json"); ta.value = txt;
  const manual = () => { ta.select(); $("jsonMsg").textContent = "Selecciónalo y cópialo a mano."; };
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { $("jsonMsg").textContent = "Copiado."; }, manual); else manual();
});
/* Acepta un estado suelto o un paquete {"scenarios": {"nombre": estado, …}}, que se añade a la lista de escenarios. */
$("jsonLoad").addEventListener("click", () => {
  try {
    const o = JSON.parse($("json").value);
    if (o && o.scenarios && typeof o.scenarios === "object") {
      const sc = scenarios(), names = Object.keys(o.scenarios).filter(n => M.valid(o.scenarios[n]));
      if (!names.length) throw new Error();
      names.forEach(n => { sc[n] = M.normalize(clone(o.scenarios[n])); });
      store.set(KEY_SC, sc); renderScenarios();
      load(clone(sc[names[0]]));
      $("jsonMsg").textContent = `${names.length} escenarios importados; cargado «${names[0]}».`;
      return;
    }
    if (!M.valid(o)) throw new Error();
    load(o); $("jsonMsg").textContent = "Estado cargado.";
  } catch { $("jsonMsg").textContent = "El texto no es un estado válido. Pega un JSON copiado desde aquí o un paquete de escenarios."; }
});

/* ---------- Tooltip ---------- */
const tip = $("tip");
document.addEventListener("pointermove", e => {
  const t = e.target.closest?.("[data-tip]");
  if (!t) { tip.classList.remove("on"); return; }
  tip.textContent = t.dataset.tip; tip.classList.add("on");
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + 12, y = e.clientY + 14;
  if (x + w > innerWidth - 8) x = e.clientX - w - 12;
  if (y + h > innerHeight - 8) y = e.clientY - h - 14;
  tip.style.left = x + "px"; tip.style.top = y + "px";
});
document.addEventListener("pointerleave", () => tip.classList.remove("on"));

/* ---------- Arranque ---------- */
(async () => {
  try { presets = await (await fetch(PRESET_DIR + "presets.json", { cache: "no-cache" })).json(); } catch { presets = []; }
  $("presetSel").innerHTML = presets.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
  $("presetNote").textContent = presets[0]?.desc || "";
  const want = new URLSearchParams(location.search).get("escenario");
  const saved = store.get(KEY_CUR);
  if (want && presets.some(p => p.id === want)) { $("presetSel").value = want; await loadPreset(want); }
  else if (M.valid(saved)) { try { load(saved); } catch { await loadPreset(presets[0]?.id) || load(blank()); } }
  else if (!presets.length || !await loadPreset(presets[0].id)) load(blank());
  renderScenarios();
  window.elecciones = { get st() { return st; }, M, update, rebuild, loadPreset, get last() { return lastE; } };
})();
