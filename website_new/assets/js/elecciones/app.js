/* Simulador electoral · INTERFAZ (/mundo/utils/elecciones). El modelo está en model.js. */
import * as M from "./model.js?v=20261106";
import { slug, Library } from "./library.js?v=20261106";

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
const KEY_CUR = "raldamain-elecciones-actual";

let st = null;
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

/* Elección directa: en lugar del hemiciclo, el resultado de cada vuelta (o ronda) en barras */
function roundsViz(D) {
  const t = T(), ids = IDS();
  const cols = D.method === "college"
    ? [{ h: "Voto popular", r: D.votes, unit: "%" }, { h: "Votos electorales", r: D.ev, unit: "ev", need: D.need }]
    : D.rounds.map((r, i) => ({ h: D.method === "irv" ? `Ronda ${i + 1}` : D.method === "tworound" ? `${i + 1}.ª vuelta` : "Votación", r, unit: "%" }));
  const block = ({ h, r, unit, need }, i) => {
    const alive = ids.filter(id => r[id] != null), V = alive.reduce((a, id) => a + r[id], 0) || 1;
    const rows = alive.sort((a, b) => r[b] - r[a]);
    const max = Math.max(...rows.map(id => r[id] / V), 0.5);
    const last = i === cols.length - 1;
    return `<div class="rv-round"><div class="rv-head">${esc(h)}${need ? ` <span class="muted">· mayoría ${need}</span>` : ""}</div>${rows.map(id => {
      const share = r[id] / V * 100, win = last && D.win === id;
      const val = unit === "ev" ? `${fmtP(r[id])}` : `${fmtP(share)} %`;
      const tip = `${candName(id)} · ${pName(id)} · ${unit === "ev" ? `${fmtP(r[id])} votos electorales` : `${fmtN(r[id])} votos (${fmtP(share)} %)`}`;
      return `<div class="rv-row${win ? " win" : ""}" data-tip="${esc(tip)}"><span class="rv-name">${sw(col(id))}${esc(candName(id))}</span>
        <span class="rv-bar"><span style="width:${(share / max).toFixed(1)}%;background:${col(id)}"></span>${unit === "%" ? `<i style="left:${(50 / max).toFixed(1)}%"></i>` : ""}</span>
        <span class="rv-val num">${val}${win ? " ✓" : ""}</span></div>`;
    }).join("")}</div>`;
  };
  let note = "";
  if (D.method === "tworound" && D.rounds.length === 1 && D.win) note = `${candName(D.win)} supera el 50 % en la primera vuelta: no hace falta segunda.`;
  if (D.method === "tworound" && D.rounds.length > 1) note = `Pasan a la segunda vuelta los dos más votados: ${Object.keys(D.rounds[1]).map(candName).join(" y ")}.`;
  if (D.method === "irv" && D.rounds.length > 1) note = "En cada ronda se elimina al último y sus votantes pasan a su siguiente preferencia.";
  $("rviz").innerHTML = `<div class="rv-title">Elección directa de ${esc(t.office.toLowerCase())}</div>${cols.map(block).join("")}${note ? `<div class="rv-note muted">${esc(note)}</div>` : ""}
    <div class="rv-legend muted">${D.method !== "college" ? "La raya marca el 50 %. " : ""}${fmtN(D.V)} votos válidos.</div>`;
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

const W0 = D => !!(D && D.win);
const isDirect = () => st.election.kind === "direct";
/* mirando la elección presidencial (no la cámara de un país presidencialista): los escaños no deciden nada */
const presView = () => isDirect() && st.mode === "cand";
const isCollege = () => presView() && st.election.direct === "college";
/* el más votado de cada región en la elección directa (1.ª vuelta) */
const regionLeader = res => IDS().reduce((a, id) => (res.e[id] || 0) > (res.e[a] || 0) ? id : a, IDS()[0]);
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
      verdict = D.win ? [col(D.win), `${candName(D.win)} gana la elección a ${t.office.toLowerCase()}`, `${fmtP(D.ev[D.win])} votos electorales de ${D.T} (mayoría ${D.need}).`]
        : [col("I"), "Nadie llega a la mayoría del colegio", `Hacen falta ${D.need} votos electorales. Tendría que decidir la cámara.`];
    } else {
      const V2 = Object.values(last).reduce((a, b) => a + b, 0);
      const W = D.win;
      const how = D.method === "tworound" ? (D.rounds.length > 1 ? "en segunda vuelta" : "en primera vuelta") : D.method === "irv" ? `tras ${D.rounds.length - 1} eliminaciones` : "por mayoría simple";
      verdict = W ? [col(W), `${candName(W)} gana la elección a ${t.office.toLowerCase()}`, `${cap(how)}: ${fmtP(V2 ? last[W] / V2 * 100 : 0)} % de los votos válidos.`] : [col("I"), "Sin votos", "Ningún distrito tiene votos."];
    }
    /* las vueltas ya están a la izquierda: aquí, el mapa del voto (regiones que gana cada uno) */
    const dres = E.ch.dres.filter((r, i) => (st.districts[i].pop || 0) > 0);
    const won = id => E.ch.dres.filter((r, i) => (st.districts[i].pop || 0) > 0 && regionLeader(r) === id);
    const popOf = rs => rs.reduce((a, r) => a + (st.districts[E.ch.dres.indexOf(r)].pop || 0), 0), P = popOf(dres) || 1;
    if (D.method === "college") {
      $("cards").innerHTML = `<div class="cards-h">Votos electorales · ${D.T}</div>` + ids.map(id => card(candName(id), col(id), fmtP(D.ev[id]), `${won(id).length} regiones`)).join("");
      segs = ids.map(id => [id, D.ev[id]]); maj = D.need;
    } else {
      $("cards").innerHTML = `<div class="cards-h">Regiones ganadas · 1.ª vuelta</div>` + ids.map(id => card(candName(id), col(id), won(id).length, `${fmtP(popOf(won(id)) / P * 100, 0)} % de la población`)).join("");
      segs = ids.map(id => [id, won(id).length]);
    }
  } else if (!prop) {
    maj = M.threshold(st.election.rule, N);
    const simple = st.election.rule === "simple";
    const pl = id => cnt(id), ln = id => cnt("L:" + id), i = cnt("I");
    const neu = ids.reduce((a, id) => a + ln(id), 0) + i;
    $("cards").innerHTML = ids.map(id => card(candName(id), col(id), pl(id), ln(id) ? `+${ln(id)} inclinados` : esc(pName(id)))).join("")
      + card("Neutrales", col("I"), neu, `${i} sin inclinación`);
    segs = ordC().map(k => [k, cnt(k)]);
    const byPl = [...ids].sort((a, b) => pl(b) + ln(b) - pl(a) - ln(a) || pl(b) - pl(a));
    const W = simple ? null : ids.find(id => pl(id) >= maj);
    if (simple) {
      const tops = [...ids].sort((a, b) => pl(b) + ln(b) - pl(a) - ln(a));
      const a = tops[0], b = tops[1];
      const va = pl(a) + ln(a), vb = b ? pl(b) + ln(b) : 0;
      verdict = va > vb ? [col(a), `${candName(a)} gana la elección a ${t.office.toLowerCase()}`, `Mayoría simple: ${va} votos (contando inclinaciones) frente a ${vb}.`]
        : [col("I"), `Empate: desempata ${chairName || t.chairTitle}`, `${candName(a)} y ${candName(b)} con ${va} votos cada uno.`];
      maj = null;
    } else if (W) verdict = [col(W), `${candName(W)} gana la elección a ${t.office.toLowerCase()}`, `${pl(W)} comprometidos de ${N} (mayoría ${maj}).`];
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
  $("capTotal").textContent = N; $("capMaj").textContent = maj ?? "—";
  $("capWord").textContent = `${t.members} · umbral`;
  $("verdict").innerHTML = `<span class="dot" style="background:${verdict[0]}"></span><div><strong>${esc(verdict[1])}</strong><span>${esc(verdict[2])}</span></div>`;
  const total = segs.reduce((a, [, c]) => a + c, 0) || 1;
  $("mbar").innerHTML = segs.filter(([, c]) => c).map(([k, c]) => `<div style="width:${c / total * 100}%;background:${col(k)}" data-tip="${esc((E.direct ? candName(k) : byParty(E) ? labN(k) : prop ? LAB_P[k] : labC(k)) + ": " + fmtP(c, 0))}"></div>`).join("");
  const tick = $("mtick");
  if (maj) { tick.style.display = ""; tick.style.left = `calc(${maj / total * 100}% - 1px)`; tick.dataset.label = `${maj}`; }
  else tick.style.display = "none";
  /* lo primero a la vista; el resto, plegado en «Detalles» (se recuerda si estaba abierto) */
  const was = !!$("subline").querySelector("details[open]");
  $("subline").innerHTML = (sub[0] ? `<div>${sub[0]}</div>` : "")
    + (sub.length > 1 ? `<details${was ? " open" : ""}><summary>Detalles</summary>${sub.slice(1).map(s => `<div>${s}</div>`).join("")}</details>` : "");
  /* elección directa: las vueltas ocupan el sitio del hemiciclo */
  const showRounds = !!E.direct;
  $("hemi").toggleAttribute("hidden", showRounds); document.querySelector(".hemi-caption").hidden = showRounds; $("rviz").hidden = !showRounds;
  if (showRounds) roundsViz(E.direct); else hemicycle(R, !!prop, byParty(E));
}

const slateLabel = v => v.kind === "n" ? `${T().national} · ${pName(v.pid)}` : `Lista ${pName(v.pid)} · ${v.bloc}`;
const editBtn = v => `<button class="link" data-edit="${esc(v.key)}">${esc(v.kind === "e" ? v.name : slateLabel(v))}</button>`;
function uniqBlocs(list) { const seen = new Set(); return list.filter(x => !seen.has(x.v.key) && seen.add(x.v.key)); }

/* ---------- Mapa ---------- */
function mapView(E) {
  const { R, prop } = E, X = st.axX, Y = st.axY, A = AX();
  const sx = v => 50 + (v + 10) / 20 * 360, sy = v => 400 - (v + 10) / 20 * 360;
  let s = `<rect x="50" y="40" width="360" height="360" fill="none" stroke="var(--rule)"/>`;
  for (const g of [-5, 0, 5]) s += `<line x1="${sx(g)}" y1="40" x2="${sx(g)}" y2="400" stroke="var(--rule)" ${g ? 'stroke-dasharray="3 4"' : ""}/><line x1="50" y1="${sy(g)}" x2="410" y2="${sy(g)}" stroke="var(--rule)" ${g ? 'stroke-dasharray="3 4"' : ""}/>`;
  s += `<text x="50" y="420" font-size="12" fill="var(--muted)">← ${esc(A[X].a)}</text><text x="410" y="420" font-size="12" fill="var(--muted)" text-anchor="end">${esc(A[X].b)} →</text>`;
  s += `<text x="16" y="400" font-size="12" fill="var(--muted)" transform="rotate(-90 16 400)">← ${esc(A[Y].a)}</text><text x="16" y="40" font-size="12" fill="var(--muted)" transform="rotate(-90 16 40)" text-anchor="end">${esc(A[Y].b)} →</text>`;
  const marks = [], under = [];
  const dm = mapMode();
  const showMembers = dm !== "dist", showDist = dm !== "members";
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
  /* las circunscripciones: dónde están, qué dan y cuánto falta para que cambie un escaño */
  const swings = [], dlabs = [];
  const maxPop = Math.max(1, ...st.districts.map(d => d.pop || 0));
  if (showDist && E.direct) E.ch.dres.forEach((res, di) => {
    /* elección presidencial: cada región es un pastel de sus votantes (voto válido), del tamaño de su población */
    const d = st.districts[di], p = districtPos(d, res), ids = IDS(), valid = ids.reduce((a, id) => a + res.e[id], 0) || 1;
    const x = sx(p[X]) + jit("d" + di, 6), y = sy(p[Y]) + jit("e" + di, 6), rad = 5 + Math.sqrt((d.pop || 0) / maxPop) * 13;
    const votes = [...ids].sort((a, b) => res.e[b] - res.e[a]).map(id => `${candName(id)} ${fmtP(res.e[id] / valid * 100)} %`).join(", ");
    const tip = `${d.name}${d.desc ? ` — ${d.desc}` : ""} · ${fmtN(d.pop || 0)} hab. · participación ${fmtP(100 - res.e.I)} % · ${votes}${isCollege() ? ` · ${d.el} votos electorales` : ""}`;
    pts.push(`<g class="pt dpt" data-dist="${di}" data-tip="${esc(tip)}">` + pie(x, y, rad, ids.map(id => [col(id), res.e[id]]))
      + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="none" stroke="var(--surface)" stroke-width="1.5"/></g>`);
    if (mode !== "off") dlabs.push(`<text x="${x.toFixed(1)}" y="${(y + rad + 9).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="var(--muted)" stroke="var(--surface)" stroke-width="2.5" paint-order="stroke" pointer-events="none">${esc(mode === "full" ? d.name : d.name.split(" — ").pop())}</text>`);
  });
  else if (showDist) E.ch.dres.forEach((res, di) => {
    const d = st.districts[di], p = districtPos(d, res), n = d.el | 0;
    const x = sx(p[X]) + jit("d" + di, 6), y = sy(p[Y]) + jit("e" + di, 6), rad = 5 + Math.sqrt(Math.max(1, n)) * 2.4;
    const sw = districtSwing(d, res, E.ch.natShare);
    if (sw) swings.push({ di, d, sw });
    const hot = sw && sw.pts < SWING_PTS;
    const ids = IDS(), valid = ids.reduce((a, id) => a + res.e[id], 0) || 1;
    const split = ids.filter(id => res.seatsBy[id]).map(id => `${pName(id)} ${res.seatsBy[id]}`).join(", ") || "sin escaños";
    const votes = [...ids].sort((a, b) => res.e[b] - res.e[a]).slice(0, 3).map(id => `${pName(id)} ${fmtP(res.e[id] / valid * 100)} %`).join(", ");
    const tip = `${d.name}${d.desc ? ` — ${d.desc}` : ""} · ${n} escaño${n === 1 ? "" : "s"} (${methodName(res.method)}) · ${split} · votos: ${votes}`
      + (sw ? ` · ${sw.kind === "pr" ? "el último escaño" : n > 1 ? "los escaños" : "el escaño"} cambia${sw.kind !== "pr" && n > 1 ? "n" : ""} si ${pName(sw.challenger)} gana ${fmtP(sw.pts)} pts` : "");
    pts.push(`<g class="pt dpt" data-dist="${di}" data-tip="${esc(tip)}">`
      + (hot ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(rad + 4).toFixed(1)}" fill="none" stroke="${col(sw.challenger)}" stroke-width="${(1.2 + (SWING_PTS - sw.pts) * 0.8).toFixed(2)}" stroke-dasharray="3 2"/>` : "")
      + pie(x, y, rad, ids.map(id => [col(id), res.seatsBy[id]]))
      + `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="none" stroke="var(--surface)" stroke-width="1.5"/>`
      + (n > 1 ? `<text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" font-size="10" text-anchor="middle" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke" font-family="var(--font-data)">${n}</text>` : "")
      + `</g>`);
    if (mode !== "off") dlabs.push(`<text x="${x.toFixed(1)}" y="${(y + rad + 9).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="var(--muted)" stroke="var(--surface)" stroke-width="2.5" paint-order="stroke" pointer-events="none">${esc(mode === "full" ? d.name : d.name.split(" — ").pop())}</text>`);
  });
  /* (las listas elegidas no se dibujan: sus distritos ya están en el mapa como circunscripciones) */
  if (showMembers) R.filter(x => x.v.kind === "e").forEach(({ v, r }) => {
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
  $("mapIntro").textContent = E.direct ? "Elige dos ejes. Cada pastel es una región en su centro ideológico: cómo vota y, por su tamaño, cuánta gente vive allí. Pulsa una para ir a su distrito."
    : "Elige dos ejes. Cada punto pequeño es un miembro designado; cada pastel es una circunscripción en su centro ideológico, con los escaños que reparte (el número) y un anillo si está disputada. Pulsa un punto para editarlo o ir a su distrito.";
  $("map").innerHTML = s + under.join("") + pts.join("") + marks.join("") + dlabs.join("") + labs.join("");
  const items = prop ? [["Y", "Sí"], ["N", "No"], ["A", "En duda"]]
    : byParty(E) ? ordC().map(k => [k, labN(k)])
    : ordC().map(k => [k, k === "I" ? "Neutral" : k.startsWith("L:") ? `Neutral → ${candName(k.slice(2))}` : `${candName(k)} (comprometido)`]);
  const dLegend = showDist && E.direct ? `<div class="dleg">${IDS().map(id => `<span>${sw(col(id))}${esc(candName(id))}</span>`).join("")}</div>
      <div class="note">◔ Cada región, en su centro ideológico: el pastel es su voto y el tamaño, su población.</div>`
    : showDist ? `<div class="dleg">${IDS().map(id => `<span>${sw(col(id))}${esc(pName(id))}</span>`).join("")}</div>
      <div class="note">◔ Cada circunscripción, en su centro ideológico: el pastel son sus escaños y el tamaño, cuántos reparte. Anillo discontinuo: un escaño cambia de manos con menos de ${SWING_PTS} puntos (en el color del aspirante).</div>`
    + (swings.length ? `<div class="swl"><b>Más disputadas</b>${[...swings].sort((a, b) => a.sw.pts - b.sw.pts).slice(0, 8).map(({ di, d, sw: s }) =>
        `<button class="link" data-dist="${di}" data-tip="${esc(`${pName(s.holder)} → ${pName(s.challenger)}`)}">${sw(col(s.challenger))}${esc(d.name)} <span class="num">${fmtP(s.pts)} pts</span></button>`).join("")}</div>` : "") : "";
  $("mapLegend").innerHTML = (showMembers ? items.map(([k, l]) => `<div>${sw(col(k))}${esc(l)}</div>`).join("") : "") + dLegend
    + (prop ? `<div><span style="color:var(--brass)">★</span> Propuesta · □ statu quo</div>` : `<div>◆ Candidatos · □ statu quo</div>`);
}

/* ---------- Circunscripciones en el mapa ---------- */
const SWING_PTS = 3;
/* Su punto en los ejes: el centro si su voto es ideológico; si se escribe a mano, la media de las listas pesada por el voto */
function districtPos(d, res) {
  if (d.mode === "ideo") return d.center;
  const ids = IDS(), tot = ids.reduce((a, id) => a + res.e[id], 0);
  return AX().map((_, k) => tot ? ids.reduce((a, id) => a + res.e[id] * (d.slates[id]?.pos[k] ?? party(id).pos[k]), 0) / tot : 0);
}
/* Lo cerca que está de cambiar un escaño: puntos de voto (sobre los válidos) que necesita el aspirante.
   Mayoritario: la mitad de la ventaja del primero. Dos vueltas: la de la segunda vuelta.
   Proporcional: lo que le falta al siguiente partido para quitar el último escaño. */
function districtSwing(d, res, natShare) {
  const ids = IDS(), votes = M.districtVotes(st, d, res.e, natShare), V = ids.reduce((a, id) => a + votes[id], 0);
  if (!V || !(d.el > 0)) return null;
  const pc = x => Math.max(0, x) / V * 100, m = res.method;
  if (M.DIVISORS[m] && m !== "wta") {
    const div = M.DIVISORS[m];
    let holder = null, last = Infinity;
    ids.forEach(id => { const s = res.seatsBy[id]; if (s > 0 && votes[id] / div(s - 1) < last) { last = votes[id] / div(s - 1); holder = id; } });
    let ch = null, need = Infinity;
    ids.forEach(id => { if (id === holder) return; const n = last * div(res.seatsBy[id]) - votes[id]; if (n < need) { need = n; ch = id; } });
    return holder && ch ? { holder, challenger: ch, pts: pc(need), kind: "pr" } : null;
  }
  if (m === "hare" || m === "droop") {
    const q = m === "droop" ? Math.floor(V / (d.el + 1)) + 1 : V / d.el;
    const full = id => Math.floor(votes[id] / q), rem = id => votes[id] - full(id) * q;
    const won = ids.filter(id => res.seatsBy[id] > full(id)), lost = ids.filter(id => res.seatsBy[id] <= full(id) && votes[id] > 0);
    if (!won.length || !lost.length) return null;
    const h = won.reduce((a, id) => rem(id) < rem(a) ? id : a), c = lost.reduce((a, id) => rem(id) > rem(a) ? id : a);
    return { holder: h, challenger: c, pts: pc(rem(h) - rem(c)), kind: "pr" };
  }
  if (res.rounds?.length > 1) {
    const r2 = res.rounds[1], [a, b] = Object.keys(r2), T2 = r2[a] + r2[b], w = r2[a] >= r2[b] ? a : b;
    return { holder: w, challenger: w === a ? b : a, pts: Math.abs(r2[a] - r2[b]) / 2 / T2 * 100, kind: "maj" };
  }
  const [a, b] = [...ids].sort((x, y) => votes[y] - votes[x]);
  if (!b || !votes[b]) return null;
  return { holder: a, challenger: b, pts: pc((votes[a] - votes[b]) / 2), kind: "maj" };
}
function pie(cx, cy, r, parts) {
  const on = parts.filter(([, n]) => n > 0), T_ = on.reduce((a, [, n]) => a + n, 0);
  if (!T_) return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="var(--surface)" stroke="var(--muted)" stroke-dasharray="2 2"/>`;
  if (on.length === 1) return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${on[0][0]}"/>`;
  let a0 = -Math.PI / 2;
  return on.map(([c, n]) => {
    const a1 = a0 + n / T_ * 2 * Math.PI, big = a1 - a0 > Math.PI ? 1 : 0;
    const path = `M${cx.toFixed(1)},${cy.toFixed(1)} L${(cx + r * Math.cos(a0)).toFixed(2)},${(cy + r * Math.sin(a0)).toFixed(2)} A${r.toFixed(1)},${r.toFixed(1)} 0 ${big} 1 ${(cx + r * Math.cos(a1)).toFixed(2)},${(cy + r * Math.sin(a1)).toFixed(2)}Z`;
    a0 = a1;
    return `<path d="${path}" fill="${c}"/>`;
  }).join("");
}
/* Pulsar una circunscripción (en el mapa o en la lista): su fila de distritos */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-dist]"); if (!b) return;
  openDistrict(+b.dataset.dist);
  const row = $("drow-" + b.dataset.dist); if (!row) return;
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
});

/* ---------- Bloques ---------- */
function blocNames(R) {
  const used = new Set(R.filter(x => x.v.kind === "e").map(x => x.v.bloc));
  return [...st.bodies.filter(b => used.has(b)), ...[...used].filter(b => !st.bodies.includes(b))];
}
/* Con una propuesta: los pactos de las listas elegidas (todos sus escaños votan igual) */
function listPacts(E) {
  const box = $("listPacts"), p = E.prop;
  if (!p) { box.hidden = true; box.innerHTML = ""; return; }
  const lists = uniqBlocs(E.R.filter(x => x.v.kind !== "e"));
  box.hidden = !lists.length;
  const n = key => E.R.filter(x => x.v.key === key).length;
  box.innerHTML = `<span class="lab">Pactos con listas</span>` + lists.map(({ v, r }) => {
    const ov = p.ov[v.key];
    return `<button class="ovb lp${ov ? " on" : ""}" data-ov="${esc(v.key)}" data-tip="${esc(`${slateLabel(v)} · ${n(v.key)} escaños · ${pct(r.prob)} Sí${ov ? " · pacto" : ""}`)}">${sw(col(v.pid), false)}${esc(v.kind === "n" ? T().national : v.bloc)} <span class="num">${n(v.key)}</span> · ${ov ? (ov === "A" ? "Abst." : LAB_P[ov]) : `<span class="muted">${LAB_P[r.cls]}</span>`}</button>`;
  }).join("");
}

/* ---------- Miembros ---------- */
const emptyRoll = () => st.electors.length ? "Nadie coincide con el filtro."
  : `Esta cámara no tiene ${T().members} designados: todos sus escaños son elegidos (están en «Distritos»).`;
/* Solo los designados se quitan aquí: los escaños elegidos salen de los distritos */
const delCell = v => v.kind === "e"
  ? `<td class="c"><button class="x eldel" data-eldel="${v.id}" title="Quitar a ${esc(v.name)} de la cámara" aria-label="Quitar a ${esc(v.name)}">×</button></td>`
  : `<td></td>`;
function removeElector(id) {
  st.electors = st.electors.filter(x => x.id !== id);
  st.proposals.forEach(p => delete p.ov["e" + id]);
  if (st.chair === "e" + id) st.chair = "";
  lastProp = null; buildSystem(); update();
}
let rowDelArmed = null;
$("rollBody").addEventListener("click", e => {
  const b = e.target.closest("[data-eldel]"); if (!b) return;
  e.stopPropagation();
  const id = +b.dataset.eldel;
  if (rowDelArmed !== id) {
    rowDelArmed = id; b.textContent = "¿Quitar?"; b.classList.add("armed");
    setTimeout(() => { if (rowDelArmed === id) { rowDelArmed = null; update(); } }, 3000);
    return;
  }
  rowDelArmed = null;
  removeElector(id);
});
function roll(E) {
  const { R, prop } = E;
  const fb = $("fBloc").value, fr = $("fRes").value, ft = $("fText").value.trim().toLowerCase();
  const rows = R.filter(({ v, r }) => v.kind === "e" && (!fb || v.bloc === fb) && (!fr || r.cls === fr) && (!ft || (v.name + " " + v.role).toLowerCase().includes(ft)));
  listPacts(E);
  const seatsOf = key => R.filter(x => x.v.key === key).length;
  const who = v => v.kind !== "e"
    ? `<button class="link" data-edit="${esc(v.key)}">${esc(slateLabel(v))}</button><small>${seatsOf(v.key)} escaños · votan en bloque</small>`
    : `<button class="link" data-edit="${esc(v.key)}">${esc(v.name)}</button><small>${esc(v.role)}</small>`;
  const partyDot = v => party(v.party) ? `<span class="sw" style="background:${col(v.party)};border-radius:50%" data-tip="${esc(pName(v.party))} · lealtad ${pct(v.loyalty)}"></span>` : `<span class="muted">—</span>`;
  if (byParty(E)) {
    $("rollNote").textContent = `Los ${T().members} designados y su posición en los ejes (− primer polo, + segundo polo). Pulsa un nombre para editarlo; los escaños elegidos están en «Distritos».`;
    $("rollHead").innerHTML = `<tr><th>${esc(cap(T().member))}</th><th>Bloque</th><th class="c">Partido</th>${AX().map(a => `<th class="c" data-tip="${esc(`− ${a.a} · + ${a.b}`)}">${esc(a.k)}</th>`).join("")}<th></th></tr>`;
    const tint = m => `background:color-mix(in srgb, var(--brass) ${Math.round(Math.abs(m) * 3.5)}%, transparent)`;
    $("rollBody").innerHTML = rows.map(({ v, r }) => `<tr><td class="who">${who(v)}</td><td>${esc(v.bloc)}</td><td class="c"><span class="sw" style="background:${col(r.cls)};border-radius:50%" data-tip="${esc(labN(r.cls))}"></span></td>${v.pos.map((x, d) => `<td class="c num" style="${tint(x)}" data-tip="${esc(`${AX()[d].k}: ${x > 0 ? AX()[d].b : x < 0 ? AX()[d].a : "centro"} · peso ${v.w?.[d] ?? 1}`)}">${x > 0 ? "+" + x : x}</td>`).join("")}${delCell(v)}</tr>`).join("")
      || `<tr><td colspan="${4 + AX().length}" class="muted">${emptyRoll()}</td></tr>`;
    return;
  }
  $("rollNote").textContent = prop
    ? "Pulsa «Pacto» para forzar el voto de un miembro, o el de una lista entera arriba (sobornos, favores, órdenes)."
    : `Los ${T().members} designados. Pulsa un nombre para editar su ideología; los escaños elegidos están en «Distritos».`;
  $("rollHead").innerHTML = `<tr><th>${esc(cap(T().member))}</th><th>Bloque</th><th class="c">Partido</th>${prop ? "" : `<th class="c">Compromiso</th>`}<th>${prop ? "P(Sí)" : "Inclinación"}</th><th>Resultado</th>${prop ? `<th class="c">Pacto</th>` : ""}<th></th></tr>`;
  $("rollBody").innerHTML = rows.map(({ v, r }) => {
    const n = v.kind !== "e" ? seatsOf(v.key) : 1;
    const pledge = prop ? "" : `<td class="c">${v.pledge && party(v.pledge) ? `<span class="chip">${sw(col(v.pledge))}${esc(pName(v.pledge))}</span>` : `<span class="muted">libre</span>`}</td>`;
    const p = r.prob;
    const bar = prop
      ? `<div class="row" style="flex-wrap:nowrap"><div class="pbar"><div style="left:${Math.min(50, p * 100)}%;width:${Math.abs(p - .5) * 100}%;background:${p >= .5 ? col("Y") : col("N")}"></div></div><span class="num">${pct(p)}</span></div>`
      : `<div class="row" style="flex-wrap:nowrap"><div class="pbar nomid"><div style="left:0;width:${p * 100}%;background:${col(r.top)}"></div></div><span class="num">${pct(p)} ${esc(pName(r.top))}</span></div>`;
    const res = `<span class="chip">${sw(col(r.cls))}${esc(prop ? LAB_P[r.cls] : labC(r.cls))}${n > 1 ? ` ×${n}` : ""}</span>${r.red ? ` <span class="flag" data-tip="Línea roja: ${esc(AX()[r.red.ax].k)}">⚑ línea roja</span>` : ""}${!prop && r.locked && r.model !== r.locked ? ` <span class="flag" data-tip="Su ideología le lleva a otro lado">grieta</span>` : ""}`;
    const ov = prop ? `<td class="c"><button class="ovb${r.ov ? " on" : ""}" data-ov="${esc(v.key)}">${r.ov ? (r.ov === "A" ? "Abst." : LAB_P[r.ov]) : "—"}</button></td>` : "";
    return `<tr><td class="who">${who(v)}</td><td>${esc(v.bloc)}</td><td class="c">${partyDot(v)}</td>${pledge}<td>${bar}</td><td>${res}</td>${ov}${delCell(v)}</tr>`;
  }).join("") || `<tr><td colspan="8" class="muted">${emptyRoll()}</td></tr>`;
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
  const t = T();
  $("mode").innerHTML = `<option value="cand">Elección de ${esc(t.office.toLowerCase())}</option>`
    + `<option value="none">Solo la cámara (sin votación)</option>`
    + (st.proposals.length ? `<optgroup label="Propuestas">${st.proposals.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</optgroup>` : "");
  $("mode").value = st.mode;
  $("mode").title = curProp()?.desc || "";
  renderSysbar();
}
/* Arriba: parlamentaria o presidencial, y su variante */
const PARL_VARIANTS = [
  { id: "abs", rule: "abs", rounds: "single", label: "Mayoría absoluta", tip: "Hace falta la mitad más uno de la cámara; si nadie llega, hay que pactar." },
  { id: "absrun", rule: "abs", rounds: "runoff", label: "Absoluta + 2.ª vuelta", tip: "Si nadie llega a la mitad más uno, segunda votación entre los dos primeros." },
  { id: "simple", rule: "simple", rounds: "single", label: "Mayoría simple", tip: "Gana quien tenga más votos de la cámara." },
  { id: "three5", rule: "three5", rounds: "single", label: "Tres quintos", tip: "Hacen falta 3/5 de la cámara." },
  { id: "two3", rule: "two3", rounds: "single", label: "Dos tercios", tip: "Hacen falta 2/3 de la cámara." }
];
const PRES_VARIANTS = [
  { id: "tworound", label: "Dos vueltas", tip: "Si nadie pasa del 50 %, segunda vuelta entre los dos más votados." },
  { id: "plurality", label: "Mayoría simple", tip: "Gana el más votado, en una sola vuelta." },
  { id: "irv", label: "Voto alternativo", tip: "Se elimina al último una y otra vez; sus votantes pasan a su siguiente preferencia." },
  { id: "college", label: "Colegio electoral", tip: "Cada distrito da todos sus escaños de votos electorales al más votado allí." }
];
function renderSysbar() {
  const el = st.election, t = T(), direct = el.kind === "direct", office = t.office.toLowerCase();
  $("kindSubI").textContent = `la cámara elige ${office}`;
  $("kindSubD").textContent = `el pueblo elige ${office}`;
  $("kindSeg").querySelectorAll("[data-kind]").forEach(b => { const on = (b.dataset.kind === "direct") === direct; b.classList.toggle("on", on); b.setAttribute("aria-checked", String(on)); });
  const cur = direct ? el.direct : (PARL_VARIANTS.find(v => v.rule === el.rule && (v.rule !== "abs" || v.rounds === (el.rounds || "single"))) || {}).id;
  $("variantSeg").innerHTML = (direct ? PRES_VARIANTS : PARL_VARIANTS).map(v =>
    `<button type="button" role="radio" class="chip${v.id === cur ? " on" : ""}" aria-checked="${v.id === cur}" data-variant="${v.id}" data-tip="${esc(v.tip)}">${esc(v.label)}</button>`).join("");
  $("topSeatsF").hidden = presView();
  $("topSeats").innerHTML = M.METHODS.map(m => opt(m.id, m.short, st.system.method)).join("");
  $("topSeats").title = M.METHODS.find(m => m.id === st.system.method)?.hint || "";
}
function setElection(patch) {
  Object.assign(st.election, patch);
  if (!curProp()) st.mode = "cand";
  lastProp = null; buildSystem(); buildDistricts(); fillMode(); update();
}
$("kindSeg").addEventListener("click", e => {
  const b = e.target.closest("[data-kind]"); if (!b) return;
  const direct = b.dataset.kind === "direct";
  setElection(direct ? { kind: "direct", direct: st.election.direct || "tworound" } : { kind: "indirect", rule: st.election.rule || "abs" });
});
$("variantSeg").addEventListener("click", e => {
  const b = e.target.closest("[data-variant]"); if (!b) return;
  if (st.election.kind === "direct") setElection({ direct: b.dataset.variant });
  else { const v = PARL_VARIANTS.find(x => x.id === b.dataset.variant); setElection({ rule: v.rule, rounds: v.rounds }); }
});
$("lede").addEventListener("click", () => { const L = $("lede"); if (L.classList.contains("long") || L.classList.contains("open")) L.classList.toggle("open"); });
$("topSeats").addEventListener("change", e => { st.system.method = e.target.value; lastProp = null; buildSystem(); buildDistricts(); update(); });
function header() {
  const t = T();
  $("eyebrow").textContent = t.eyebrow; $("title").textContent = t.title; $("lede").textContent = t.lede;
  /* la introducción, plegada a dos líneas: clic para leerla entera */
  const L = $("lede"); L.classList.add("clamp"); L.classList.remove("open");
  requestAnimationFrame(() => { L.classList.toggle("long", L.scrollHeight > L.clientHeight + 2); });
  document.title = `${t.title} · Simulador electoral | Raldamain`;
}

/* ---------- Actualización general ---------- */
let lastProp = null, lastE = null;
function update() {
  const E = lastE = evaluate();
  const mk = (E.none ? "none" : E.prop ? E.prop.id : "cand") + st.election.kind;
  if (lastProp !== mk) { fillFilters(E); lastProp = mk; }
  board(E); mapView(E); roll(E); updateDistricts(E); systemStats(E);
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
    $("dlg").close(); dlgTarget = null;
    removeElector(obj.id);
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
    <div class="note">Paralelo: los escaños nacionales se reparten aparte, según el voto total. Compensatorio: van a quien los distritos dejaron por debajo de su proporción (como el sistema alemán).</div>
    <h3 style="margin-top:6px">Gerrymandering</h3>
    <div class="inl">
      <label class="field"><span>Quién traza los mapas</span><select data-sys="gerryBy"><option value="">Nadie (mapa neutral)</option>${st.parties.map(p => opt(p.id, p.name, s.gerryBy)).join("")}</select></label>
      <label class="field"><span>Intensidad <b class="num" id="gerryVal">${s.gerryBy ? `${Math.round((s.gerry || 0) * 100)} %` : "—"}</b></span><input type="range" min="0" max="1" step="0.05" value="${s.gerry || 0}" data-sys="gerry" ${s.gerryBy ? "" : "disabled"}></label>
    </div>
    <div class="note">Solo en los distritos uninominales: quien traza las fronteras concentra a los votantes del rival en pocas circunscripciones y reparte los suyos para ganar muchas por poco. El voto no cambia; los escaños sí. Cada distrito puede tener su propio trazado.</div>`;
  const chairOpts = `<option value="">— nadie —</option>` + st.electors.map(e => opt("e" + e.id, `${e.name} (${e.role})`, st.chair)).join("");
  $("sysOffice").innerHTML = `<h3>Elección de ${esc(t.office.toLowerCase())}</h3>
    <div class="note">${el.kind === "direct" ? `Presidencial · ${esc(PRES_VARIANTS.find(v => v.id === el.direct)?.label || "")}` : `Parlamentaria · ${esc(M.RULES[el.rule] || "")}${el.rounds === "runoff" ? " + 2.ª vuelta" : ""}`} (se elige arriba).</div>
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
  /* presidencial: el reparto de escaños no decide nada (salvo los votos electorales del colegio) */
  const direct = presView();
  $("sysSeats").hidden = direct; $("sysHouse").hidden = direct && !isCollege();
  $("cmpBox").hidden = direct; $("sysStats").hidden = direct;
  renderSysbar();
}
/* Brecha de eficiencia de las circunscripciones uninominales, entre los dos partidos con más escaños en ellas */
function egOf(results) {
  const sp = results.filter(r => r && r.split); if (!sp.length) return null;
  const seats = id => sp.reduce((a, r) => a + (r.seatsBy[id] || 0), 0);
  const [a, b] = [...IDS()].sort((x, y) => seats(y) - seats(x));
  if (!b) return null;
  const g = M.efficiencyGap(sp, a, b);
  return { fav: g >= 0 ? a : b, pts: Math.abs(g) };
}
function egStat(ch) {
  const g = egOf(ch.dres); if (!g) return "";
  return `<span data-tip="Votos desperdiciados (los del que pierde y los que le sobran al que gana) de un partido menos los del otro, entre todos los votos de las circunscripciones uninominales. Más de 7 puntos suele considerarse gerrymandering.">Brecha de eficiencia <b>${fmtP(g.pts, 1)} pts</b> a favor de ${esc(pName(g.fav))}</span>`;
}
function systemStats(E) {
  const { ch } = E, ids = IDS(), N = E.R.length;
  const ix = M.indices(st, ch.total, ch.natShare);
  const whole = id => E.R.filter(x => x.v.party === id).length;
  const maj = Math.floor(N / 2) + 1, big = [...ids].sort((a, b) => whole(b) - whole(a))[0];
  $("sysStats").innerHTML = `<span>Desproporcionalidad <b>${fmtP(ix.gallagher, 2)}</b></span><span>NEP votos <b>${fmtP(ix.enpV, 2)}</b></span><span>NEP escaños <b>${fmtP(ix.enpS, 2)}</b></span>`
    + (big ? `<span>Mayor partido: ${esc(pName(big))} <b>${whole(big)}</b> de ${N} (mayoría ${maj})</span>` : "")
    + (ch.bonusTo ? `<span>Premio de mayoría: ${esc(pName(ch.bonusTo))} <b>+${ch.bSeats[ch.bonusTo]}</b></span>` : "")
    + egStat(ch);
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
$("sysSeats").addEventListener("input", e => { if (e.target.dataset.sys === "gerry") $("gerryVal").textContent = `${Math.round(+e.target.value * 100)} %`; });
$("sysSeats").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.sys) { const k = t.dataset.sys; st.system[k] = ["threshold", "bonus"].includes(k) ? Math.max(0, +t.value || 0) : k === "gerry" ? +t.value : t.value; if (k === "gerryBy" && t.value && !st.system.gerry) st.system.gerry = 0.5; }
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
    <div class="note">Mueve votos de un partido a otro en todos los distritos a la vez (también en los de voto ideológico).</div>
    ${st.districts.some(d => d.group) ? `<div class="ctl"><label>Clasificación</label><select id="dGroupSel" class="ro-ok">${[["", "Todas"], ...[...new Set(st.districts.map(d => d.group || ""))].map(g => [g, g || "Sin clasificar"])].map(([v, l]) => opt(v, l, dGroupFilter)).join("")}</select></div>` : ""}`;
}
/* Los distritos abiertos (los demás muestran solo su resultado) y la clasificación que se ve */
const openD = new Set();
let dGroupFilter = "";
function openDistrict(k, toggle = false) {
  if (toggle && openD.has(k)) openD.delete(k); else openD.add(k);
  buildDistricts(); update();
}
function buildDistricts() {
  buildSwing();
  const groups = [...new Set(st.districts.map(d => d.group || ""))];
  const useGroups = groups.some(g => g);
  if (dGroupFilter && !groups.includes(dGroupFilter)) dGroupFilter = "";
  const order = st.districts.map((d, k) => k).filter(k => !dGroupFilter || (st.districts[k].group || "") === dGroupFilter)
    .sort((a, b) => useGroups ? groups.indexOf(st.districts[a].group || "") - groups.indexOf(st.districts[b].group || "") || a - b : a - b);
  let lastGroup = null;
  const direct = presView(), college = isCollege();
  $("dlist").innerHTML = order.map(k => {
    const d = st.districts[k];
    let head = "";
    if (useGroups && (d.group || "") !== lastGroup) {
      lastGroup = d.group || "";
      const inG = st.districts.filter(x => (x.group || "") === lastGroup);
      head = `<div class="dgroup"><span class="gname">${esc(lastGroup || "Sin clasificar")}</span>${lastGroup ? `<button class="gren" data-gren="${esc(lastGroup)}" title="Cambiar el nombre de la clasificación (en todos sus distritos)" aria-label="Renombrar ${esc(lastGroup)}">✎</button>` : ""} <span class="muted">${inG.length} distritos${direct && !college ? "" : ` · ${inG.reduce((a, x) => a + (x.el | 0), 0)} ${college ? "votos electorales" : "escaños"}`} · ${fmtN(inG.reduce((a, x) => a + (x.pop || 0), 0))} hab.</span></div>`;
    }
    const ideo = d.mode === "ideo";
    const descBox = `<label class="dnote"><span>Descripción</span><textarea data-ddesc="${k}" rows="5" maxlength="1500" placeholder="Quién vive aquí, qué le importa, su historia electoral…">${esc(d.desc || "")}</textarea></label>`;
    const inputs = ideo
      ? `<div class="ideo">
          <div class="sl"><span class="lbl" title="Cuánto tiende a votar este distrito, de 0 (nadie) a 10 (todos), si tuviera un partido cerca y sin escándalos: alfabetización, confianza en las instituciones, acceso a las urnas. La participación real sale de aquí y aparece en el resultado."><span>Participación base</span></span><input type="range" min="0" max="10" step="0.1" value="${(d.turnout / 10).toFixed(1)}" data-dturn="${k}"><span class="num" id="dturn-${k}">${(d.turnout / 10).toFixed(1)}</span></div>
          <div class="sl"><span class="lbl" title="Lo repartidos que están sus votantes alrededor del centro (puntos en cada eje): 2–3 un distrito homogéneo, 4 uno mixto, 5–6 una gran ciudad diversa."><span>Dispersión</span></span><input type="range" min="0.5" max="10" step="0.5" value="${d.spread}" data-dspread="${k}"><span class="num" id="dspread-${k}">${d.spread}</span></div>
          ${AX().map((a, x) => `<div class="axrow axw"><span class="a">${esc(a.a)}</span><input type="range" min="-10" max="10" step="1" value="${d.center[x]}" data-dc="${k}" data-x="${x}" aria-label="Centro de ${esc(d.name)}: ${esc(a.k)}"><span class="b">${esc(a.b)}</span><span class="num" id="dc-${k}-${x}">${d.center[x]}</span><input type="number" min="0" max="5" step="0.25" value="${d.w?.[x] ?? 1}" data-dw="${k}" data-x="${x}" title="Cuánto le importa este eje a este distrito (0 = nada, 3 = lo decide todo)" aria-label="Peso de ${esc(a.k)} en ${esc(d.name)}"></div>`).join("")}
          <div class="dlocal" title="Lo que un partido gana o pierde solo aquí: un candidato local, una campaña regional, un escándalo local"><span class="lbl">Ajuste local</span>${st.parties.map(p => `<label>${sw(p.color, false)}<input type="number" min="-3" max="3" step="0.1" value="${d.local?.[p.id] || 0}" data-dl="${k}" data-p="${esc(p.id)}" aria-label="Ajuste local de ${esc(p.name)} en ${esc(d.name)}"></label>`).join("")}</div>
        </div>`
      : `<div class="sliders">${st.parties.map(p => `<div class="sl"><span class="lbl">${sw(p.color, false)}<span>${esc(p.name)}</span></span><input type="range" min="0" max="100" value="${d.v[p.id] || 0}" data-dv="${k}" data-p="${esc(p.id)}" style="accent-color:${p.color}" aria-label="Voto ${esc(p.name)} en ${esc(d.name)}"><span class="num" id="dv-${k}-${esc(p.id)}">${d.v[p.id] || 0}</span></div>`).join("")}</div>`;
    const open = openD.has(k);
    return head + `<div class="dcard${open ? " open" : ""}" id="drow-${k}">
    <div class="dsum" data-dopen="${k}" role="button" tabindex="0" aria-expanded="${open}" title="${open ? "Cerrar" : "Ver y cambiar su ideología, participación y sistema"}">
      <div class="dtop"><b>${esc(d.name)}</b><span class="muted dsub">${college ? `${d.el} votos electorales · ` : direct ? "" : M.isSplit(d) ? `${d.el} uninominales · ` : `${d.el} escaño${d.el === 1 ? "" : "s"} · `}${fmtN(d.pop)} hab.</span><span class="chev">${open ? "▾" : "▸"}</span><button class="x ddelx" data-ddel="${k}" title="Eliminar el distrito" aria-label="Eliminar ${esc(d.name)}">×</button></div>
      ${d.desc ? `<div class="ddesc">${esc(d.desc)}</div>` : ""}
      <div class="dchips" id="dchip-${k}"></div>
      <div class="dbar" id="dbar-${k}"></div>
      <div class="dmeta" id="dmeta-${k}"></div>
    </div>
    ${open ? `<div class="ddet"><div class="drow">
      <div class="dname">
        <input type="text" value="${esc(d.name)}" data-dn="${k}" aria-label="Nombre del distrito" class="dtitle">
        ${direct && !college ? "" : `<span class="el"><label>${college ? "Votos electorales" : "Escaños"}</label><input type="number" min="0" max="1000" value="${d.el}" data-de="${k}"></span>`}
        <span class="el"><label>Habitantes</label><input class="pop" type="number" min="0" step="1000" value="${d.pop}" data-dp="${k}"></span>
        <span class="per" id="dper-${k}"></span>
        <div class="dctl"><span class="seg"><button data-dmode="${k}" data-m="manual" class="${ideo ? "" : "on"}">A mano</button><button data-dmode="${k}" data-m="ideo" class="${ideo ? "on" : ""}">Ideológico</button></span></div>
        ${direct ? "" : `<div class="dctl"><select data-dsys="${k}" aria-label="Sistema de ${esc(d.name)}"><option value="">Sistema de la cámara (${esc(methodName(st.system.method))})</option>${M.METHODS.map(m => opt(m.id, m.short, d.system || "")).join("")}</select></div>`}
        <label class="el"><span>Clasificación</span><input type="text" value="${esc(d.group || "")}" data-dg="${k}" list="dgroupDL" placeholder="Departamento, región…"></label>
        ${ideo && !direct ? `<label class="check" title="Cada escaño se elige en su propia circunscripción uninominal (como en Francia o EE. UU.), en vez de en bloque"><input type="checkbox" data-dsplit="${k}" ${d.split ? "checked" : ""}> Uninominales: una circunscripción por escaño</label>
          ${d.split ? `<div class="sl" title="Lo distintas que son entre sí las circunscripciones de este distrito (puntos en cada eje): 0 = todas iguales; 3 = un barrio obrero junto a uno rico"><span class="lbl"><span>Diferencias internas</span></span><input type="range" min="0" max="5" step="0.1" value="${d.subSpread ?? 1.5}" data-dsub="${k}"><span class="num" id="dsub-${k}">${d.subSpread ?? 1.5}</span></div>
          <div class="dgerry" title="Quién traza las fronteras de las circunscripciones de este distrito"><label class="el"><span>Traza el mapa</span><select data-dgby="${k}">
            <option value="">Como el país (${esc(st.system.gerryBy ? pName(st.system.gerryBy) : "neutral")})</option><option value="none" ${d.gerryBy === "none" ? "selected" : ""}>Nadie (neutral)</option>${st.parties.map(p => opt(p.id, p.name, d.gerryBy || "")).join("")}</select></label>
            ${d.gerryBy && d.gerryBy !== "none" ? `<div class="sl"><span class="lbl"><span>Intensidad</span></span><input type="range" min="0" max="1" step="0.05" value="${d.gerry ?? 0.5}" data-dgg="${k}"><span class="num" id="dgg-${k}">${Math.round((d.gerry ?? 0.5) * 100)} %</span></div>` : ""}</div>` : ""}` : ""}
      </div>
      ${inputs}
      ${descBox}
    </div></div>` : ""}
  </div>`;
  }).join("") || `<div class="note">${st.districts.length ? "Ningún distrito en esa clasificación." : `No hay distritos: la cámara es solo de ${esc(T().members)} designados.`}</div>`;
  $("dgroupDL").innerHTML = groups.filter(g => g).map(g => `<option value="${esc(g)}">`).join("");
}
function updateDistricts(E) {
  const ids = IDS(), { ch } = E;
  ch.dres.forEach((res, k) => {
    const d = st.districts[k], e = res.e, p = d.pop || 0;
    if (d.mode !== "ideo") ids.forEach(id => { const el = $(`dv-${k}-${id}`); if (el) el.textContent = d.v[id] || 0; });
    const bar = $(`dbar-${k}`); if (!bar) return;
    bar.innerHTML = [...ids, "I"].map(id => `<div style="width:${e[id]}%;background:${col(id)}" data-tip="${esc(`${id === "I" ? "Abstención / indecisos" : pName(id)} ${fmtP(e[id])}%`)}"></div>`).join("");
    const valid = ids.reduce((a, id) => a + e[id], 0) || 1;
    if (presView()) {
      const L = regionLeader(res), turn = 100 - e.I;
      $(`dchip-${k}`).innerHTML = `<span class="chip">${sw(col(L))}${esc(candName(L))} ${fmtP(e[L] / valid * 100)} %</span>`;
      $(`dmeta-${k}`).innerHTML = `${[...ids].sort((a, b) => e[b] - e[a]).map(id => `${esc(candName(id))} ${fmtP(e[id] / valid * 100)} %`).join(" · ")} · participación ${fmtP(turn)} %`;
      return;
    }
    $(`dchip-${k}`).innerHTML = res.winners.length ? res.winners.map(id => `<span class="chip">${sw(col(id))}${esc(pName(id))} ${res.seatsBy[id]}</span>`).join(" ")
      : `<span class="chip">${sw(col("I"))}Sin escaños</span>`;
    const second = res.ranked[1];
    let how = "";
    if (res.method === "wta" && res.tied?.length > 1) how = ` · empate: reparto por turnos`;
    else if (res.method === "wta" && second) how = ` · a ${esc(pName(second))} le faltan ${fmtP(res.margin / 2 + .05)} pts`;
    if (res.rounds?.length > 1) { const r2 = res.rounds[1], [a, b] = Object.keys(r2), V = r2[a] + r2[b]; how = ` · 2.ª vuelta ${esc(pName(a))} ${fmtP(r2[a] / V * 100)} % – ${esc(pName(b))} ${fmtP(r2[b] / V * 100)} %`; }
    const turn = 100 - e.I, alien = ` · participación ${fmtP(turn)} %`;
    if (res.split) {
      const g = egOf([res]);
      if (res.gerry) how += ` · mapa de ${esc(pName(res.gerry.by))} (${Math.round(res.gerry.g * 100)} %)`;
      if (g && g.pts >= 1) how += ` · brecha de eficiencia ${fmtP(g.pts, 1)} pts → ${esc(pName(g.fav))}`;
    }
    $(`dmeta-${k}`).innerHTML = `${esc(methodName(res.method))} · ${ids.map(id => `${esc(pName(id))} ${fmtP(e[id])}`).join(" / ")}${alien}${how}`
      + `<br>${ids.map(id => `<span class="num">${fmtN(p * e[id] / 100)}</span> ${esc(pName(id).toLowerCase())}`).join(" · ")}`;
    const per = $(`dper-${k}`); if (per) per.textContent = d.el ? `1 escaño cada ${fmtN(p / d.el)} hab.` : "sin escaños";
  });
  const pv = ch.pv, P = [...ids, "I"].reduce((a, id) => a + pv[id], 0), dec = P - pv.I;
  const elected = Object.fromEntries(ids.map(id => [id, ch.total[id]])), S = ids.reduce((a, id) => a + elected[id], 0);
  const bar = (t, n, withI) => `<div class="dbar">${[...ids, ...(withI ? ["I"] : [])].map(id => `<div style="width:${n ? (t[id] || 0) / n * 100 : 0}%;background:${col(id)}" data-tip="${esc(`${id === "I" ? "Abstención" : pName(id)}: ${fmtN(t[id] || 0)}`)}"></div>`).join("")}</div>`;
  const line = (t, n, withI) => `<div class="rnums">${[...ids, ...(withI ? ["I"] : [])].map(id => `<span>${sw(col(id), false)}<span class="num">${fmtN(t[id] || 0)}</span> <span class="muted">${n ? fmtP((t[id] || 0) / n * 100) + "%" : "—"}</span></span>`).join("")}</div>`;
  const nat = st.system.national.seats | 0;
  $("popvote").innerHTML = `
    <div class="rcard"><div class="lab">Voto popular · ${fmtN(P)} habitantes</div>${bar(pv, P, true)}${line(pv, P, true)}
      <div class="note">Entre votos válidos: ${ids.map(id => `${esc(pName(id))} ${fmtP(dec ? pv[id] / dec * 100 : 0)}%`).join(" · ")}.</div></div>
    ${presView() ? "" : `<div class="rcard"><div class="lab">Escaños elegidos · ${S}</div>${bar(elected, S, false)}${line(elected, S, false)}
      <div class="note">Distritos: ${ids.map(id => `${esc(pName(id))} ${ch.dSeats[id]}`).join(" · ")}${nat ? ` · nacional (${st.system.national.mode === "compensatory" ? "compensatorio" : "paralelo"}): ${ids.map(id => `${esc(pName(id))} ${ch.nSeats[id]}`).join(" · ")}` : ""}${ch.bonusTo ? ` · premio: ${esc(pName(ch.bonusTo))} +${ch.bSeats[ch.bonusTo]}` : ""}.</div></div>`}
    <div class="rcard wide" id="factors"></div>`;
  clearTimeout(factorTimer);
  factorTimer = setTimeout(() => renderFactors(E), 120);
}
/* Qué decide el voto: la misma elección quitando cada factor (carisma, reputación, campaña, ajustes locales,
   movilización). Lo que cambia el voto de cada partido y si cambiaría quién gana. */
let factorTimer = 0;
function renderFactors(E) {
  const box = $("factors"); if (!box) return;
  const ids = IDS(), fs = M.activeFactors(st);
  if (!fs.length) { box.innerHTML = `<div class="lab">Qué decide el voto</div><div class="note">Solo la ideología: ningún partido tiene carisma, reputación ni campaña distintos de 0. Dales valores en «Partidos, candidatos y statu quo» (y ajustes locales en los distritos de voto ideológico).</div>`; return; }
  const now = E.ch.natShare, office = M.officeResult(st, E.ch), t = T();
  const rows = fs.map(f => {
    const w = M.whatIf(st, f.id), flip = w.office.win !== office.win;
    const seats = ids.map(id => E.ch.total[id] - w.total[id]);
    return `<tr><td>${esc(f.name)}</td>${ids.map((id, j) => { const d = now[id] - w.share[id]; return `<td class="c num ${d > 0.05 ? "plus" : d < -0.05 ? "minus" : ""}" data-tip="${esc(`${pName(id)}: ${fmtP(w.share[id])} % sin este factor; ${fmtP(now[id])} % con él · escaños ${seats[j] > 0 ? "+" : ""}${seats[j]}`)}">${fmt(d)}</td>`; }).join("")}
      <td>${flip ? `<b class="flip">Sin él: ${esc(candName(w.office.win))}</b>` : `<span class="muted">${esc(candName(office.win))} igual</span>`}</td></tr>`;
  });
  box.innerHTML = `<div class="lab">Qué decide el voto · puntos que da cada factor (voto válido nacional)</div>
    <div class="tscroll"><table class="factors"><thead><tr><th>Factor</th>${ids.map(id => `<th class="c">${sw(col(id), false)} ${esc(pName(id))}</th>`).join("")}<th>${esc(cap(t.office))}</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
    <div class="note">Cada fila repite la elección entera sin ese factor, con todo lo demás igual: en verde, lo que ese factor le da a un partido; en rojo, lo que le quita. Lo que no explican los factores es la ideología: dónde están los votantes de cada distrito frente a los partidos.</div>`;
}
$("dswing").addEventListener("input", e => {
  if (e.target.id === "swPts") { st.swing.pts = +e.target.value; $("swVal").textContent = `${st.swing.pts} pts`; update(); }
});
$("dswing").addEventListener("change", e => {
  if (e.target.id === "dGroupSel") { dGroupFilter = e.target.value; buildDistricts(); update(); return; }
  if (e.target.id === "swFrom") { st.swing.from = e.target.value; update(); }
  if (e.target.id === "swTo") { st.swing.to = e.target.value; update(); }
});
$("dlist").addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.dn != null) {
    /* solo cosmético: el título de la tarjeta al momento; el resto (mapa, listas) al salir del cuadro */
    const d = st.districts[+t.dataset.dn]; if (d.seed == null) d.seed = d.name; d.name = t.value;
    const b = document.querySelector(`#drow-${t.dataset.dn} .dtop b`); if (b) b.textContent = t.value;
    return;
  }
  if (t.dataset.ddesc != null) {
    const k = +t.dataset.ddesc, d = st.districts[k], v = t.value.trim();
    if (v) d.desc = v; else delete d.desc;
    /* el resumen de la tarjeta, sin reconstruirla (no se pierde el cursor) */
    const sum = document.querySelector(`#drow-${k} .dsum`); let el = sum?.querySelector(".ddesc");
    if (v && !el && sum) { el = document.createElement("div"); el.className = "ddesc"; sum.insertBefore(el, $(`dchip-${k}`)); }
    if (el) { if (v) el.textContent = v; else el.remove(); }
    /* no cambia ningún resultado: sin recalcular la elección en cada tecla; el mapa (su tooltip) se pone al día
       al salir del cuadro */
    return;
  }
  if (t.dataset.de != null) { st.districts[+t.dataset.de].el = Math.max(0, Math.min(1000, Math.round(+t.value || 0))); buildSystem(); update(); return; }
  if (t.dataset.dp != null) { st.districts[+t.dataset.dp].pop = Math.max(0, Math.round(+t.value || 0)); update(); return; }
  if (t.dataset.dturn != null) { const d = st.districts[+t.dataset.dturn]; d.turnout = Math.round(+t.value * 100) / 10; $(`dturn-${t.dataset.dturn}`).textContent = (+t.value).toFixed(1); update(); return; }
  if (t.dataset.dspread != null) { const d = st.districts[+t.dataset.dspread]; d.spread = +t.value; $(`dspread-${t.dataset.dspread}`).textContent = d.spread; update(); return; }
  if (t.dataset.dgg != null) { const d = st.districts[+t.dataset.dgg]; d.gerry = +t.value; $(`dgg-${t.dataset.dgg}`).textContent = `${Math.round(d.gerry * 100)} %`; update(); return; }
  if (t.dataset.dsub != null) { const d = st.districts[+t.dataset.dsub]; d.subSpread = +t.value; $(`dsub-${t.dataset.dsub}`).textContent = d.subSpread; update(); return; }
  if (t.dataset.dw != null) { const d = st.districts[+t.dataset.dw]; d.w = d.w || AX().map(() => 1); d.w[+t.dataset.x] = Math.max(0, +t.value || 0); update(); return; }
  if (t.dataset.dl != null) { const d = st.districts[+t.dataset.dl]; d.local = d.local || {}; const v = +t.value || 0; if (v) d.local[t.dataset.p] = v; else delete d.local[t.dataset.p]; update(); return; }
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
$("dlist").addEventListener("keydown", e => {
  const o = e.target.closest("[data-dopen]");
  if (o && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDistrict(+o.dataset.dopen, true); }
});
$("dlist").addEventListener("change", e => {
  const t = e.target;
  if (t.dataset.dsys != null) { const d = st.districts[+t.dataset.dsys]; if (t.value) d.system = t.value; else delete d.system; update(); }
  if (t.dataset.dn != null) { lastProp = null; buildSystem(); update(); }
  if (t.dataset.ddesc != null && lastE) { mapView(lastE); store.set(KEY_CUR, st); }
  if (t.dataset.dg != null) { st.districts[+t.dataset.dg].group = t.value.trim(); buildDistricts(); update(); }
  if (t.dataset.dgby != null) { const d = st.districts[+t.dataset.dgby]; if (t.value) d.gerryBy = t.value; else delete d.gerryBy; if (d.gerryBy && d.gerryBy !== "none" && d.gerry == null) d.gerry = 0.5; buildDistricts(); update(); return; }
  if (t.dataset.dsplit != null) { st.districts[+t.dataset.dsplit].split = t.checked; buildDistricts(); update(); }
});
let ddelArmed = null;
/* Renombrar una clasificación: cambia el nombre en todos sus distritos a la vez (si ya existe otra con ese
   nombre, se juntan) */
function renameGroup(from, to) {
  to = to.trim();
  if (!to || to === from) { buildDistricts(); update(); return; }
  st.districts.forEach(d => { if ((d.group || "") === from) d.group = to; });
  if (dGroupFilter === from) dGroupFilter = to;
  buildDistricts(); update();
}
$("dlist").addEventListener("click", e => {
  const gr = e.target.closest("[data-gren]");
  if (gr) {
    const from = gr.dataset.gren, head = gr.closest(".dgroup"), name = head.querySelector(".gname");
    const inp = document.createElement("input");
    inp.type = "text"; inp.value = from; inp.className = "gedit"; inp.setAttribute("aria-label", "Nuevo nombre de la clasificación");
    name.replaceWith(inp); gr.hidden = true; inp.focus(); inp.select();
    let done = false;
    const commit = ok => { if (done) return; done = true; if (ok) renameGroup(from, inp.value); else { buildDistricts(); update(); } };
    inp.addEventListener("keydown", ev => { if (ev.key === "Enter") { ev.preventDefault(); commit(true); } if (ev.key === "Escape") commit(false); });
    inp.addEventListener("blur", () => commit(true));
    return;
  }
  const o = e.target.closest("[data-dopen]");
  if (o && !e.target.closest("[data-ddel]")) { openDistrict(+o.dataset.dopen, true); return; }
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
  st.districts.push({ seed: `d${Date.now().toString(36)}`, name: `Distrito ${st.districts.length + 1}`, el: 1, pop: 10000, v, slates, mode: "manual", center: Array(n).fill(0), spread: 4, turnout: 78 });
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
  lastProp = null; buildSystem(); buildDistricts(); fillMode(); update();
});

/* ---------- Partidos y candidatos ---------- */
function buildParties() {
  $("partyList").innerHTML = st.parties.map((p, i) => `<div class="prow pval">
    <input type="color" value="${esc(p.color)}" data-pc="${i}" aria-label="Color de ${esc(p.name)}">
    <label class="field"><span>Partido</span><input type="text" value="${esc(p.name)}" data-pn="${i}"></label>
    <label class="field"><span>Candidato</span><input type="text" value="${esc(p.cand)}" data-pk="${i}"></label>
    <label class="field" title="El candidato como persona: carisma, popularidad, oratoria. Atrae votos en todo el país y, con menos fuerza, a los miembros de la cámara."><span>Carisma</span><input type="number" min="-3" max="3" step="0.1" value="${p.charisma || 0}" data-pv="${i}" data-k="charisma"></label>
    <label class="field" title="La imagen del partido: escándalos y mala gestión (negativo), buena gestión o prestigio (positivo)."><span>Reputación</span><input type="number" min="-3" max="3" step="0.1" value="${p.reputation || 0}" data-pv="${i}" data-k="reputation"></label>
    <label class="field" title="Maquinaria, dinero, prensa afín, militantes: lo que la campaña añade."><span>Campaña</span><input type="number" min="-3" max="3" step="0.1" value="${p.appeal || 0}" data-pv="${i}" data-k="appeal"></label>
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
  else if (t.dataset.pv != null) st.parties[+t.dataset.pv][t.dataset.k] = +t.value || 0;
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
  ["exhaust", "Votos que no se transfieren", 0, 1, 0.05, "Distritos escritos a mano: la parte de los votos de un eliminado que se pierde en la segunda vuelta."],
  ["tm", "Movilización", 0, 4, 0.1, "Cuánto responde la participación: alto = quien tiene un candidato que le gusta vota más, y quien se queda sin opción (o ve a los suyos en un escándalo) se queda en casa."],
  ["ta", "Desafección", 0, 3, 0.1, "Cuánto se abstiene quien no tiene ningún partido cerca de sus ideas (0 = vota igual; alto = sin un partido que le represente, se queda en casa)."],
  ["cv", "Peso del carisma en la cámara", 0, 2, 0.05, "Cuánto mueven el carisma y la reputación a los miembros de la cámara (1 = tanto como a los votantes)."]
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
function buildAxSel() { $("axX").innerHTML = axOpts(st.axX); $("axY").innerHTML = axOpts(st.axY); $("mapLab").value = st.mapLab || "surname"; $("mapDist").value = mapMode(); }
/* Qué muestra el mapa: los designados, las circunscripciones o ambos (lo de antes de esta versión, ambos) */
function mapMode() { return ["members", "dist", "both"].includes(st.mapDist) ? st.mapDist : "both"; }
$("axX").addEventListener("change", e => { st.axX = +e.target.value; update(); });
$("axY").addEventListener("change", e => { st.axY = +e.target.value; update(); });
$("mapLab").addEventListener("change", e => { st.mapLab = e.target.value; update(); });
$("mapDist").addEventListener("change", e => { st.mapDist = e.target.value; update(); });
for (const id of ["fBloc", "fRes"]) $(id).addEventListener("change", update);
$("fText").addEventListener("input", update);

/* ---------- Escenarios: biblioteca país → elección ---------- */
function rebuild() { lastProp = null; header(); fillMode(); buildParties(); buildDistricts(); buildProps(); buildParams(); buildAxSel(); buildAxes(); buildSystem(); update(); }
function load(o) { st = M.normalize(o); rebuild(); fillSaveForm(); renderLibrary(); markClean(); }
/* cambios sin guardar (el editor local no recarga la página mientras haya) */
let cleanSnap = "";
const snap = () => { try { return JSON.stringify({ ...st, scenario: undefined }); } catch { return ""; } };
function markClean() { cleanSnap = snap(); }
window.dirty = () => !!cleanSnap && snap() !== cleanSnap;
const lib = new Library();
const SRC = { web: "web", folder: "carpeta", browser: "navegador" };
let cur = null;   // la elección de la biblioteca que está abierta

async function openEntry(e) {
  try {
    load(await lib.read(e));
    cur = { country: e.country, election: e.election };
    st.scenario = { country: e.country, election: e.election, desc: e.desc || st.scenario?.desc || "" };
    fillSaveForm(); renderLibrary();
    $("libNote").textContent = "";
    return true;
  } catch (err) { $("libNote").textContent = `No se pudo cargar «${e.election}» (${err.message}).`; return false; }
}
function fillSaveForm() {
  const sc = st.scenario || {};
  $("saveCountry").value = sc.country || ""; $("saveElection").value = sc.election || ""; $("saveDesc").value = sc.desc || "";
}
function renderLibrary() {
  const cs = lib.countries();
  /* los dos selectores de la cabecera */
  const selC = $("libCountry"), keepC = cur?.country || selC.value || cs[0]?.name;
  selC.innerHTML = cs.map(c => `<option value="${esc(c.name)}">${esc(c.name)} (${c.elections.length})</option>`).join("") || `<option value="">— vacía —</option>`;
  selC.value = cs.some(c => c.name === keepC) ? keepC : cs[0]?.name || "";
  fillElections();
  $("countryDL").innerHTML = cs.map(c => `<option value="${esc(c.name)}">`).join("");
  /* dónde se guarda */
  const f = $("folder");
  if (lib.dir) {
    const pub = lib.folder.filter(e => e.published).length;
    f.innerHTML = `<span class="ok">🖥 <b>Editor local</b> · <code>tools/elecciones/escenarios</code> · ${lib.folder.length} elecciones, ${pub} publicadas.</span> <span class="git" id="gitBadge"></span>
      <div class="note">Guardar, publicar y eliminar escriben en la carpeta y se suben a GitHub solos. raldamain.com solo muestra las marcadas «publicada», y allí cualquiera puede cambiarlas y guardarlas en su navegador sin tocar las tuyas.</div>`;
    gitBadge();
  } else f.innerHTML = `<span class="note">Puedes cambiar cualquier elección a tu gusto. «Guardar» la guarda en este navegador (aparece con la etiqueta «navegador»); «⬇ Descargar» te da un archivo que puedes volver a abrir aquí cuando quieras.</span>`;
  /* el árbol */
  $("libTree").innerHTML = cs.map(c => `<div class="lcountry"><h3>${esc(c.name)} <small class="muted">${c.elections.length}</small></h3>
      <div class="lels">${c.elections.map(e => {
        const on = cur && cur.country === e.country && cur.election === e.election;
        const canDel = e.src !== "web";
        return `<div class="lel${on ? " on" : ""}${e.src === "folder" && !e.published ? " unpub" : ""}"><button class="link" data-open="${esc(key(e))}" title="${esc(e.desc)}">${esc(e.election)}</button>
          ${e.src === "folder" ? `<label class="pub" title="Publicada: aparece en raldamain.com. Sin marcar, solo la ves tú (sin spoilers)."><input type="checkbox" data-pub="${esc(key(e))}" ${e.published ? "checked" : ""}> publicada</label>` : `<span class="badge ${e.src}">${SRC[e.src]}</span>`}
          ${canDel ? `<button class="x" data-del="${esc(key(e))}" title="Eliminar">×</button>` : ""}</div>`;
      }).join("")}</div></div>`).join("") || `<div class="note">La biblioteca está vacía.</div>`;
}
const key = e => `${e.src}\u0001${e.country}\u0001${e.election}`;
const byKey = k => lib.entries().find(e => key(e) === k);
function fillElections() {
  const c = lib.countries().find(x => x.name === $("libCountry").value), sel = $("libElection");
  sel.innerHTML = (c?.elections || []).map(e => `<option value="${esc(key(e))}">${esc(e.election)}${e.src === "browser" ? " (navegador)" : e.src === "folder" && !e.published ? " (sin publicar)" : ""}</option>`).join("");
  const mine = c?.elections.find(e => cur && e.country === cur.country && e.election === cur.election);
  if (mine) sel.value = key(mine);
  sel.title = byKey(sel.value)?.desc || ""; $("libNote").textContent = "";
}
$("libCountry").addEventListener("change", fillElections);
$("libElection").addEventListener("change", () => { $("libElection").title = byKey($("libElection").value)?.desc || ""; });
$("libLoad").addEventListener("click", () => { const e = byKey($("libElection").value); if (e) openEntry(e); });
/* GitHub (editor local): lo que queda por subir */
async function gitBadge() {
  const el = $("gitBadge"); if (!el) return;
  try {
    const g = await lib.gitStatus();
    el.className = "git " + ((!g.ok || g.error) ? "bad" : g.pending ? "busy" : "ok");
    el.textContent = !g.ok ? `⎇ ${g.branch || "?"}: sin push` : g.pending ? `⏳ subiendo ${g.pending}` : g.error ? "⚠ git" : "✓ GitHub";
    el.title = g.error || "El commit y el push a GitHub se hacen en segundo plano";
  } catch { el.className = "git bad"; el.textContent = "⚠ sin conexión"; el.title = "El editor de elecciones no responde (¿está cerrado?)"; }
}
if (window.ELECCIONES_LOCAL) setInterval(gitBadge, 4000);
const gitNote = () => lib.git && /error|fail|no se pudo/i.test(lib.git) ? ` ⚠ GitHub: ${lib.git}` : "";
let saveArmed = null, delArmed2 = null;
$("scenSave").addEventListener("click", async () => {
  const country = $("saveCountry").value.trim(), election = $("saveElection").value.trim(), desc = $("saveDesc").value.trim();
  const msg = $("saveMsg"), btn = $("scenSave");
  if (!country || !election) { msg.textContent = "Escribe el país y la elección."; return; }
  const same = cur && cur.country === country && cur.election === election;
  const there = lib.dir ? lib.folder.find(e => e.country === country && e.election === election) : lib.find(country, election);
  if (there && !same && saveArmed !== `${country}\u0001${election}`) {
    saveArmed = `${country}\u0001${election}`; btn.textContent = "Ya existe: pulsa otra vez para sobrescribir";
    setTimeout(() => { saveArmed = null; btn.textContent = "Guardar"; }, 4000);
    return;
  }
  saveArmed = null; btn.textContent = "Guardar";
  try {
    st.scenario = { country, election, desc };
    const where = await lib.save(country, election, desc, st);
    cur = { country, election };
    msg.textContent = where === "folder" ? `Guardado en la carpeta: ${country} › ${election} · subiendo a GitHub…${gitNote()}` : `Guardado en este navegador: ${country} › ${election}.`;
    store.set(KEY_CUR, st); markClean();
  } catch (err) { msg.textContent = `No se pudo guardar: ${err.message}`; }
  renderLibrary();
});
$("libTree").addEventListener("change", async ev => {
  const c = ev.target.closest("[data-pub]"); if (!c) return;
  const e = byKey(c.dataset.pub); if (!e) return;
  try {
    await lib.setPublished(e, c.checked);
    if (cur && cur.country === e.country && cur.election === e.election) st.scenario = { ...(st.scenario || {}), published: c.checked };
    $("saveMsg").textContent = (c.checked ? `Publicada: ${e.country} › ${e.election} (aparecerá en raldamain.com en cuanto se suba).` : `Sin publicar: ${e.country} › ${e.election} (desaparece de la web).`) + gitNote();
  } catch (err) { $("saveMsg").textContent = `No se pudo cambiar: ${err.message}`; c.checked = !c.checked; }
  renderLibrary();
});
$("libTree").addEventListener("click", async ev => {
  const o = ev.target.closest("[data-open]"), d = ev.target.closest("[data-del]");
  if (o) { const e = byKey(o.dataset.open); if (e) { await openEntry(e); $("libCountry").value = e.country; fillElections(); } }
  if (d) {
    const e = byKey(d.dataset.del); if (!e) return;
    if (delArmed2 !== d.dataset.del) {
      delArmed2 = d.dataset.del; d.textContent = "¿Eliminar?"; d.classList.add("armed");
      setTimeout(() => { if (delArmed2 === d.dataset.del) { delArmed2 = null; renderLibrary(); } }, 3000);
      return;
    }
    delArmed2 = null;
    try {
      await lib.remove(e);
      if (cur && cur.country === e.country && cur.election === e.election) cur = null;
      $("saveMsg").textContent = `Eliminado: ${e.country} › ${e.election}.`;
    } catch (err) { $("saveMsg").textContent = err.message; }
    renderLibrary();
  }
});
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
  cur = null; load(blank());
});
$("jsonCopy").addEventListener("click", () => {
  const txt = JSON.stringify(st, null, 2), ta = $("json"); ta.value = txt;
  const manual = () => { ta.select(); $("jsonMsg").textContent = "Selecciónalo y cópialo a mano."; };
  if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { $("jsonMsg").textContent = "Copiado."; }, manual); else manual();
});
/* Acepta un estado suelto, o un paquete {"scenarios": {"nombre": estado, …}} que se guarda en la biblioteca
   (en el país escrito arriba, o en «Importados») */
$("jsonLoad").addEventListener("click", async () => {
  try {
    const o = JSON.parse($("json").value);
    if (o && o.scenarios && typeof o.scenarios === "object") {
      const names = Object.keys(o.scenarios).filter(n => M.valid(o.scenarios[n]));
      if (!names.length) throw new Error();
      const country = $("saveCountry").value.trim() || "Importados";
      for (const n of names) await lib.save(country, n, "", M.normalize(clone(o.scenarios[n])));
      const first = lib.find(country, names[0]);
      if (first) await openEntry(first);
      $("jsonMsg").textContent = `${names.length} escenarios guardados en «${country}»; cargado «${names[0]}».`;
      renderLibrary();
      return;
    }
    if (!M.valid(o)) throw new Error();
    cur = null; load(o); $("jsonMsg").textContent = "Estado cargado. Ponle país y elección y pulsa Guardar para conservarlo.";
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

/* ---------- Variantes y archivos ---------- */
/* «⧉ Variante»: guarda una copia de lo que tienes delante como otra elección del mismo país
   («… · variante 2»), para probar valores sin tocar la original */
$("scenVariant").addEventListener("click", async () => {
  const sc = st.scenario || {}, country = $("saveCountry").value.trim() || sc.country || cur?.country || "Sin país";
  const base = ($("saveElection").value.trim() || sc.election || cur?.election || "Elección").replace(/ · variante \d+$/, "");
  let n = 2; while (lib.find(country, `${base} · variante ${n}`)) n++;
  const election = `${base} · variante ${n}`, desc = $("saveDesc").value.trim();
  try {
    st.scenario = { country, election, desc };
    const where = await lib.save(country, election, desc, st);
    cur = { country, election };
    fillSaveForm(); renderLibrary(); store.set(KEY_CUR, st); markClean();
    $("saveMsg").textContent = `Variante guardada${where === "folder" ? " en la carpeta (sin publicar)" : " en este navegador"}: ${country} › ${election}. La original sigue igual.${gitNote()}`;
  } catch (err) { $("saveMsg").textContent = `No se pudo guardar la variante: ${err.message}`; }
});
$("fileSave").addEventListener("click", () => {
  const sc = st.scenario || {}, name = `${slug(sc.country || "eleccion")}-${slug(sc.election || "escenario")}.json`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(st, null, 1)], { type: "application/json" }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  $("saveMsg").textContent = `Descargado: ${name}.`;
});
$("fileOpen").addEventListener("click", () => $("fileIn").click());
$("fileIn").addEventListener("change", async ev => {
  const f = ev.target.files?.[0]; ev.target.value = ""; if (!f) return;
  try {
    const o = JSON.parse(await f.text());
    if (!M.valid(o)) throw new Error("no es una elección del simulador");
    cur = null; load(o);
    $("saveMsg").textContent = `Abierto: ${f.name}. Pulsa «Guardar» para tenerlo en la biblioteca.`;
  } catch (err) { $("saveMsg").textContent = `No se pudo abrir ${f.name}: ${err.message}.`; }
});

/* ---------- Secciones plegables (se recuerda cuáles están plegadas) ---------- */
const KEY_FOLD = "raldamain-elecciones-plegadas";
(() => {
  let folded = [];
  try { folded = JSON.parse(localStorage.getItem(KEY_FOLD)) || []; } catch { /* nada */ }
  document.querySelectorAll("main.elec section.panel").forEach(sec => {
    const h = sec.querySelector(".sec-head h2"); if (!h) return;
    h.classList.add("fold"); h.tabIndex = 0; h.setAttribute("role", "button");
    const set = on => { sec.classList.toggle("folded", on); h.setAttribute("aria-expanded", String(!on)); };
    set(folded.includes(h.id));
    const toggle = () => {
      const on = !sec.classList.contains("folded"); set(on);
      folded = on ? [...new Set([...folded, h.id])] : folded.filter(x => x !== h.id);
      try { localStorage.setItem(KEY_FOLD, JSON.stringify(folded)); } catch { /* nada */ }
    };
    h.addEventListener("click", toggle);
    h.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  });
})();

/* ---------- Arranque ---------- */
(async () => {
  await lib.init();
  const want = new URLSearchParams(location.search).get("escenario"), wantE = want && lib.findSlug(want);
  const saved = store.get(KEY_CUR);
  const first = async () => { const e = lib.countries()[0]?.elections[0]; if (!e || !await openEntry(e)) load(blank()); };
  if (wantE) await openEntry(wantE);
  else if (M.valid(saved)) {
    try {
      load(saved);
      const sc = saved.scenario;
      if (sc && lib.find(sc.country, sc.election)) { cur = { country: sc.country, election: sc.election }; renderLibrary(); }
    } catch { await first(); }
  } else await first();
  window.elecciones = { get st() { return st; }, M, lib, update, rebuild, openEntry, renderLibrary, get last() { return lastE; } };
})();
