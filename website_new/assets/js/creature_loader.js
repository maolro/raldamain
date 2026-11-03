// =============================================
// CREATURE LOADER - Loads and renders creature data
// Supports both legacy format (data.combat.pv) and
// new compact format (data.hits + data.saves)
// =============================================

const STATUS_EFFECTS = [
    'aturdido', 'aturdida', 'aturdidos', 'aturdidas',
    'derribado', 'derribada', 'derribados', 'derribadas',
    'tropezado', 'tropezada', 'tropezados', 'tropezadas',
    'agarrado', 'agarrada', 'agarrados', 'agarradas',
    'cegado', 'cegada', 'cegados', 'cegadas',
    'quemadura leve', 'quemadura media', 'quemadura grave', 'quemadura',
    'veneno', 'envenenado', 'envenenada', 'envenenados', 'envenenadas',
    'paralizado', 'paralizada', 'paralizados', 'paralizadas',
    'ralentizado', 'ralentizada', 'ralentizados', 'ralentizadas',
    'inconsciente', 'inconscientes',
    'moribundo', 'moribunda', 'moribundos', 'moribundas'
];

function linkStatusEffects(text) {
    if (!text) return text;
    let processed = text;
    const sortedEffects = [...STATUS_EFFECTS].sort((a, b) => b.length - a.length);
    sortedEffects.forEach(effect => {
        const regex = new RegExp(`\\b(${effect})\\b`, 'gi');
        processed = processed.replace(regex, (match) => {
            return `<a href="/reglas.html#efectos-de-estado" class="status-effect-link"><i>${match}</i></a>`;
        });
    });
    return processed;
}

// Wrap *text* in italics
function parseInlineMarkdown(text) {
    if (!text) return text;
    return text.replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// Format dice strings: "3d8+6 Fuego" → "3d8 + 6 Fuego"
function formatDice(str) {
    if (!str) return str;
    return str.replace(/\s*\+\s*/g, '+').replace(/([a-z0-9])\+/gi, '$1 + ');
}

// Highlight saving throws (yellow) and damage (red) inside ability text.
// Saves go first and are set aside, so the dice of a save DC ("FÍS +5 + 1d6") never turn red.
const DMG_TYPES = 'Cortante|Perforante|Contundente|F[íi]sico|Fuego|Fr[íi]o|El[ée]ctrico|[ÁáAa]cido|S[óo]nico|Radiante|Necr[óo]tico|Arcano|M[áa]gico|Ps[íi]quico|Fuerza|Veneno|General|Agua|Tierra|Aire|Metal|Naturaleza|Sagrado|Sombr[íi]o';
const SAVE_STAT = '(?:F[ÍIíi]S(?:ic[oa]s?)?|VOL(?:untad)?|MEN(?:tal(?:es)?)?)';
const SAVE_NUM = '[+-]\\s*(?:MOD|\\d+)(?:\\s*\\+\\s*\\d*d\\d+)*';
const SAVE_RES = [
    // "tiro de salvación Físico +7 + 1d6", "salvación de Voluntad", "Salvación FÍS (CD +MOD)"
    new RegExp(`(?:tiros?\\s+de\\s+)?salvaci[oó]n(?:es)?\\s+(?:de\\s+)?${SAVE_STAT}(?:\\s*(?:contra\\s+|\\(CD\\s*)?${SAVE_NUM}\\)?)?`, 'gi'),
    // "+5 + 1d6 VOL", "+MOD FÍS"
    new RegExp(`${SAVE_NUM}\\s+${SAVE_STAT}\\b`, 'g'),
    // "FÍS +MOD", "VOL +7 + 1d6"
    new RegExp(`\\b${SAVE_STAT}\\s*${SAVE_NUM}`, 'g'),
];
const DMG_RES = [
    // "2d6 + 4 Perforante", "4d8 de daño Fuego", "1d6 daño", "3d6 + 5 de daño Contundente/Perforante"
    new RegExp(`\\b\\d*d\\d+(?:\\s*\\+\\s*\\d+)?(?:\\s+(?:de\\s+)?da[ñn]o)?(?:\\s+(?:de\\s+)?(?:${DMG_TYPES})(?:\\s*\\/\\s*(?:${DMG_TYPES}))*)?`, 'gi'),
    // "LOW daño Contundente", "MID de daño"
    new RegExp(`\\b(?:LOW|MID|HIGH)\\s+(?:de\\s+)?da[ñn]o(?:\\s+(?:${DMG_TYPES})(?:\\s*\\/\\s*(?:${DMG_TYPES}))*)?`, 'g'),
    // "10 de daño Fuego", "5 puntos de daño"
    new RegExp(`\\b\\d+\\s+(?:puntos\\s+)?de\\s+da[ñn]o(?:\\s+(?:${DMG_TYPES}))?`, 'gi'),
];
function highlightCombatText(text) {
    if (!text) return text;
    const kept = [];
    const keep = (html) => `\u0000${kept.push(html) - 1}\u0000`;
    let out = String(text);
    for (const re of SAVE_RES) out = out.replace(re, m => keep(`<span class="save-hl">${m}</span>`));
    for (const re of DMG_RES) out = out.replace(re, m => keep(`<span class="damage">${m}</span>`));
    return out.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[+i]);
}

function getModifier(score) {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(part => part.length > 0);
    const creatureId = segments[segments.length - 1];

    fetch(`/data/creatures/${creatureId}.json`)
        .then(response => {
            if (!response.ok) throw new Error("Creature not found");
            return response.json();
        })
        .then(data => {
            renderCreaturePage(data);
            // Download the creature's own file, ready to upload to /simulador
            const dl = document.getElementById("creature-download");
            if (dl) {
                dl.href = `/data/creatures/${creatureId}.json`;
                dl.setAttribute("download", `${creatureId}.json`);
                document.getElementById("creature-actions").hidden = false;
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById("creature-name").innerText = "Criatura no encontrada";
            document.getElementById("statblock").innerHTML = `
                <div style="padding: 2rem; text-align: center;">
                    <p style="color: #ff6b6b;">No se pudo cargar la información de esta criatura.</p>
                    <a href="/criaturas" style="color: var(--accent-gold);">Volver al Bestiario</a>
                </div>
            `;
        });
});

// ── PASSIVE EFFECTS ──────────────────────────────────────────────────────────
// A passive (trait) can carry "effects" that the stat block applies on its own, like
// the Creador does with a player's passives. The hand-written umbrales / immune /
// senses / speed stay the creature's base; the passives are added on top:
//   effects: { umbrales: [{ categories: "Magia", steps: 1, flat?: 0, amount?: 4, choose? }],
//              immune: ["Miedo", …], senses: ["Sentido Vital"], speed: ["Natación 1"],
//              extra_damage: [{ dice: "DD", dice_value?: "2d6", type: "Necrótico", on: "fisicos", choose? }] }
// steps = steps of the Tier's umbral jump (Salto); amount / dice_value are resolved for the
// creature's level by the creature builder (the tables below are only a fallback).
// A threshold builds on the same umbral the simulator would use: the exact damage type,
// else its group (Físico / Magia), else General. Mirrored in combat-simulator/raldamain/data/website.py.
const CE_GROUPS = { cortante: 'fisico', perforante: 'fisico', contundente: 'fisico',
    fuego: 'magico', frio: 'magico', electrico: 'magico', acido: 'magico', arcano: 'magico',
    radiante: 'magico', necrotico: 'magico', psiquico: 'magico', sonico: 'magico',
    agua: 'magico' };   // (water effects count as magic for a passive's umbral)
const CE_KEYS = { fisico: 'fisico', magia: 'magico', magico: 'magico', general: 'general' };
const CE_PHYS = ['cortante', 'perforante', 'contundente'];
const CE_TYPE_WORDS = [...CE_PHYS, 'fuego', 'frio', 'electrico', 'acido', 'arcano', 'radiante', 'necrotico',
    'psiquico', 'sonico', 'fuerza', 'veneno', 'magico'];
const CE_MAGIC_TAGS = ['fuego', 'hielo', 'frio', 'agua', 'aire', 'tierra', 'tormenta', 'electric', 'acido', 'arcan',
    'evocac', 'nigroman', 'necrot', 'mental', 'vida', 'sombr', 'radiant', 'sonic', 'psiqu', 'divin', 'magi'];
const CE_SALTO = [[0, 2], [6, 4], [12, 5], [18, 6], [99, 7]];          // level ≤ n → Salto (fallback)
const CE_DD = [[0, '1d4'], [3, '1d6'], [6, '2d6'], [9, '3d8'], [12, '4d8'], [15, '5d10'], [18, '6d10'], [99, '7d12']];

function cePlain(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function ceKey(cat) {
    const k = cePlain(String(cat || '').split(/[/,]| o /)[0]);
    return CE_KEYS[k] || k || 'general';
}
function ceSalto(level) { return CE_SALTO.find(([n]) => (+level || 0) <= n)[1]; }
function ceDice(text, level) {
    const m = /^\s*DD\s*(?:([+-])\s*(\d+))?\s*$/i.exec(String(text || ''));
    if (!m) return String(text || '');
    const dd = CE_DD.find(([n]) => (+level || 0) <= n)[1].split('d');
    const off = m[1] ? (m[1] === '-' ? -1 : 1) * +m[2] : 0;   // DD+1 / DD-1: one die more / fewer
    const n = Math.max(1, +dd[0] + off);
    return `${n}d${dd[1]}`;
}
// Which attacks an extra damage rides: todos · fisicos · naturales · arma
function ceAttackKind(action) {
    const tags = cePlain((action.tags || []).join(' '));
    const dmg = cePlain(action.damage);
    const typed = CE_TYPE_WORDS.some(w => dmg.includes(w));
    const phys = tags.includes('fisic') || CE_PHYS.some(w => dmg.includes(w))
        || (!typed && !CE_MAGIC_TAGS.some(w => tags.includes(w)));
    return { phys, natural: tags.includes('natural') || (phys && !tags.includes('arma')), arma: tags.includes('arma') };
}
function ceRides(action, on) {
    if (!action || !action.bonus || !action.damage) return false;
    const k = ceAttackKind(action);
    return on === 'fisicos' ? k.phys : on === 'naturales' ? k.natural : on === 'arma' ? k.arma : true;
}
function ceAddWords(base, words) {
    const list = String(base || '').split(',').map(s => s.trim()).filter(Boolean);
    for (const w of words || []) if (w && !list.some(x => cePlain(x) === cePlain(w))) list.push(String(w).trim());
    return list.join(', ');
}

function applyTraitEffects(data) {
    const traits = (data.traits || []).filter(t => t && t.effects);
    if (!traits.length || data._effects_applied) return data;
    const out = JSON.parse(JSON.stringify(data));
    out._effects_applied = true;   // applying twice would add every step twice
    const level = out.level;

    // Umbrales: total per category, groups (Magia / Físico / General) before the types that build on them
    const touched = new Map();   // key → { name, amount }
    for (const t of traits) for (const u of t.effects.umbrales || []) {
        if (!String(u.categories || '').trim()) continue;   // "elige" not chosen yet
        const amount = u.amount != null ? +u.amount : (+u.steps || 0) * ceSalto(level) + (+u.flat || 0);
        for (const name of String(u.categories).split(',').map(s => s.trim()).filter(Boolean)) {
            const key = ceKey(name);
            const cur = touched.get(key) || { name, amount: 0 };
            cur.amount += amount;
            touched.set(key, cur);
        }
    }
    if (touched.size) {
        const entries = (out.umbrales || []).map(u => ({ ...u, cats: String(u.categories || 'General').split(',').map(s => s.trim()).filter(Boolean) }));
        const value = {};
        for (const e of entries) for (const c of e.cats) value[ceKey(c)] = +e.value || 0;
        if (value.general == null) value.general = Object.keys(value).length ? Math.min(...Object.values(value)) : 2;
        const baseOf = key => value[key] ?? (CE_GROUPS[key] && value[CE_GROUPS[key]]) ?? value.general;
        const isGroup = k => ['general', 'magico', 'fisico'].includes(k);
        const order = [...touched.keys()].sort((a, b) => isGroup(b) - isGroup(a));
        const result = {};
        for (const key of order) { result[key] = Math.max(0, baseOf(key) + touched.get(key).amount); value[key] = result[key]; }
        for (const e of entries) e.cats = e.cats.filter(c => !(ceKey(c) in result));
        const kept = entries.filter(e => e.cats.length);
        for (const key of order) {
            const name = touched.get(key).name;
            const same = kept.find(e => +e.value === result[key]);
            if (same) key === 'general' ? same.cats.unshift(name) : same.cats.push(name);
            else kept.push({ value: result[key], cats: [name], from_traits: true });
        }
        out.umbrales = kept.map(({ cats, ...u }) => ({ ...u, categories: cats.join(', ') }));
    }

    const all = k => traits.flatMap(t => t.effects[k] || []);
    const immune = [...(out.immune || [])];
    for (const i of all('immune')) if (i && !immune.some(x => cePlain(x) === cePlain(i))) immune.push(i);
    out.immune = immune;
    if (all('senses').length) out.senses = ceAddWords(out.senses, all('senses'));
    if (all('speed').length) out.speed = ceAddWords(out.speed, all('speed'));

    for (const t of traits) for (const x of t.effects.extra_damage || []) {
        if (!String(x.type || '').trim() || !x.dice) continue;   // element not chosen yet
        const dice = x.dice_value || ceDice(x.dice, level);
        for (const a of out.actions || []) if (ceRides(a, x.on || 'todos'))
            (a.extra_damage = a.extra_damage || []).push({ dice, type: x.type, source: t.name });
    }
    return out;
}

function renderCreaturePage(data) {
    // Passives with effects add their umbrales, immunities, senses and extra damage
    if (data && data.hits != null) data = applyTraitEffects(data);

    // A. Meta tags
    if (typeof updateMetaTags === 'function') {
        updateMetaTags({
            title: `${data.name} | Raldamain Bestiario`,
            description: `${data.type} ${data.tier ? '· ' + data.tier : (data.level != null && data.level !== '' ? 'de nivel ' + data.level : '')}. ${data.lore ? data.lore.substring(0, 150) + '...' : ''}`,
            image: data.id ? `${window.location.origin}/assets/images/creatures/${data.id}.jpg` : `${window.location.origin}/assets/images/raldamain_logo.png`,
            url: window.location.href,
            type: 'article'
        });
    } else {
        document.title = `${data.name} | Raldamain Bestiario`;
    }

    // B. Hero
    document.getElementById("creature-name").innerText = data.name;
    const hero = document.getElementById("hero-section");
    // (no picture yet: the logo shows through underneath)
    hero.style.background = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/assets/images/creatures/${data.id}.jpg') center/cover, url('/assets/images/raldamain_logo.png') center/220px no-repeat #111`;

    // C. Meta badges
    const metaContainer = document.getElementById("creature-meta");
    const levelBadge = data.tier
        ? `<div class="creature-meta-badge level">${data.tier}</div>`
        : `<div class="creature-meta-badge level">Nivel ${data.level}</div>`;
    metaContainer.innerHTML = `
        ${levelBadge}
        <div class="creature-meta-badge">${data.size}</div>
        <div class="creature-meta-badge">${data.type}</div>
        ${data.published === false ? '<div class="creature-meta-badge" title="Criatura en pruebas del Taller">No publicada</div>' : ''}
    `;

    // D. Statblock header
    document.getElementById("statblock-name").innerText = data.name;
    const subtitleEl = document.getElementById("statblock-subtitle");
    if (data.level != null && data.level !== '') {
        subtitleEl.innerText = `${data.type} ${data.size}  ·  Nivel ${data.level}`;
        subtitleEl.style.display = '';
    } else {
        subtitleEl.style.display = 'none';
    }

    // Detect format
    const isNewFormat = data.hits !== undefined;

    if (isNewFormat) {
        renderNewFormat(data);
    } else {
        renderLegacyFormat(data);
    }

    // H. Traits (shared)
    const traitsContainer = document.getElementById("statblock-traits");
    const traitsSeparator = document.getElementById("traits-separator");
    if (data.traits && data.traits.length > 0) {
        traitsContainer.innerHTML = data.traits.map(trait => `
            <div class="trait-block">
                <span class="trait-name">${trait.name}.</span>
                <span class="trait-desc">${linkStatusEffects(parseInlineMarkdown(highlightCombatText(trait.desc)))}</span>
            </div>
        `).join('');
    } else {
        traitsContainer.style.display = 'none';
        traitsSeparator.style.display = 'none';
    }

    // I. Actions
    const numActions = (data.combat && data.combat.acciones) || (isNewFormat ? null : null);
    const actionsSectionTitle = document.querySelector('#statblock .statblock-section:not(#reactions-section):not(#legendary-section) .statblock-section-title');
    if (actionsSectionTitle && numActions) {
        actionsSectionTitle.innerText = `Acciones (${numActions})`;
    }

    const actionsContainer = document.getElementById("statblock-actions");
    actionsContainer.innerHTML = data.actions.map(action => renderAction(action, isNewFormat)).join('');

    // J. Reactions
    const numReactions = (data.combat && data.combat.reacciones) || 0;
    if (numReactions > 0 || (data.reactions && data.reactions.length > 0)) {
        const reactionsSection = document.getElementById("reactions-section");
        reactionsSection.style.display = 'block';
        const reactionsSectionTitle = reactionsSection.querySelector('.statblock-section-title');
        if (reactionsSectionTitle && numReactions > 0) {
            reactionsSectionTitle.innerText = `Reacciones (${numReactions})`;
        }
        const reactionsContainer = document.getElementById("statblock-reactions");
        if (data.reactions && data.reactions.length > 0) {
            reactionsContainer.innerHTML = data.reactions.map(r => renderReaction(r, isNewFormat)).join('');
        }
    }

    // K. Legendary Actions
    if (data.legendaryActions) {
        const legendarySection = document.getElementById("legendary-section");
        legendarySection.style.display = 'block';
        document.getElementById("legendary-intro").innerText =
            `${data.name} puede realizar ${data.legendaryActions.points} acciones legendarias, eligiendo entre las opciones siguientes.`;
        const legendaryContainer = document.getElementById("statblock-legendary");
        legendaryContainer.innerHTML = data.legendaryActions.actions.map(action => `
            <div class="legendary-action action-block">
                <span class="action-name">${action.name}</span>
                <span class="legendary-cost">(Coste: ${action.cost})</span>.
                <span class="action-desc">${linkStatusEffects(highlightCombatText(action.desc))}</span>
            </div>
        `).join('');
    }

    // L. Lore
    if (data.lore) {
        document.getElementById("lore-text").innerHTML = linkStatusEffects(data.lore);
    } else {
        document.getElementById("creature-lore").style.display = 'none';
    }

    // M. Loot
    if (data.loot) {
        document.getElementById("loot-xp-value").innerText = data.loot.xp.toLocaleString();
        const lootBody = document.getElementById("loot-items");
        lootBody.innerHTML = data.loot.items.map(item => `
            <tr><td>${item.name}</td><td>${item.chance}</td></tr>
        `).join('');
    } else {
        document.getElementById("creature-loot").style.display = 'none';
    }

    // N. Tags
    if (data.tags && data.tags.length > 0) {
        const tagsContainer = document.getElementById("creature-tags");
        tagsContainer.innerHTML = data.tags.map(tag =>
            `<span class="creature-tag">${tag}</span>`
        ).join('');
    }
}

// ── NEW FORMAT (data.hits present) ──────────────────────────────────────────

function renderNewFormat(data) {
    // F. Hide abilities grid (no raw stats in new format)
    document.getElementById("statblock-abilities").style.display = 'none';
    const separators = document.querySelectorAll('#statblock .statblock-separator');
    if (separators[1]) separators[1].style.display = 'none';

    // E. Top row: Impactos + UD, separator, then Salvaciones
    const combatContainer = document.getElementById("statblock-combat");

    // Build UD string
    let udText = '';
    if (data.umbrales && data.umbrales.length) {
        udText = data.umbrales.map(u => `${u.value} (${u.categories})`).join(' · ');
    }

    // Build saves pills
    const savePills = Object.entries(data.saves || {}).map(([stat, val]) =>
        `<span class="save-pill"><span class="save-label">${stat}</span> <span class="save-value">${val}</span></span>`
    ).join('');

    combatContainer.innerHTML = `
        <div class="new-format-toprow">
            <span class="nf-stat"><span class="property-label">Impactos</span> <span class="hits-value">${data.hits}</span></span>
        </div>
    `;

    // G. Properties: UD → Saves → separator → Immune, Senses, Speed
    const propertiesContainer = document.getElementById("statblock-properties");
    let html = '';

    // Umbrales de Daño
    if (udText) {
        html += `<div class="property-line"><span class="property-label">Umbrales de Daño</span><span class="property-value">${udText}</span></div>`;
    }

    // Tiros de Salvación
    if (data.saves) {
        html += `<div class="property-line new-format-savesrow">
            <span class="property-label nf-saves-label">Tiros de Salvación</span>
            <div class="save-pills">${savePills}</div>
        </div>`;
    }

    // Separator beneath saves
    html += `<div class="statblock-separator nf-props-sep"></div>`;

    // Immunities
    if (data.immune && data.immune.length > 0) {
        const pills = data.immune.map(i =>
            `<span class="defense-pill immunity">${linkStatusEffects(i)}</span>`
        ).join('');
        html += `<div class="property-line"><span class="property-label">Inmune</span><span class="defense-pills">${pills}</span></div>`;
    }

    // Senses
    if (data.senses) {
        html += `<div class="property-line"><span class="property-label">Sentidos</span><span class="property-value">${data.senses}</span></div>`;
    }

    // Speed
    if (data.speed) {
        html += `<div class="property-line"><span class="property-label">Velocidad</span><span class="property-value">${data.speed}</span></div>`;
    }

    propertiesContainer.innerHTML = html;
}

// ── LEGACY FORMAT ────────────────────────────────────────────────────────────

function renderLegacyFormat(data) {
    // E. Combat stats
    const combatContainer = document.getElementById("statblock-combat");
    combatContainer.innerHTML = `
        <div class="combat-stat">
            <span class="combat-stat-label">PV</span>
            <span class="combat-stat-value">${data.combat.pv || data.combat.hp || '-'}</span>
        </div>
        <div class="combat-stat">
            <span class="combat-stat-label">Vitalidad</span>
            <span class="combat-stat-value">${data.combat.vitalidad || '-'}</span>
        </div>
        <div class="combat-stat">
            <span class="combat-stat-label">Defensa</span>
            <span class="combat-stat-value">${data.combat.defense}</span>
        </div>
    `;

    // F. Ability scores
    const abilitiesContainer = document.getElementById("statblock-abilities");
    if (data.stats) {
        const statOrder = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
        abilitiesContainer.innerHTML = statOrder.map(stat => `
            <div class="ability-block">
                <span class="ability-label">${stat}</span>
                <span class="ability-score">${data.stats[stat]}</span>
            </div>
        `).join('');
    }

    // G. Properties
    const propertiesContainer = document.getElementById("statblock-properties");
    let html = '';

    if (data.saves) {
        const savesStr = Object.entries(data.saves).map(([k, v]) => `${k} ${v}`).join(', ');
        html += `<div class="property-line"><span class="property-label">Tiradas de Salvación</span>${savesStr}</div>`;
    }
    if (data.skills && data.skills.length > 0) {
        html += `<div class="property-line"><span class="property-label">Habilidades</span>${data.skills.join(', ')}</div>`;
    }
    if (data.defenses.resistances && data.defenses.resistances.length > 0) {
        const pills = data.defenses.resistances.map(r => `<span class="defense-pill resistance">${r}</span>`).join('');
        html += `<div class="property-line"><span class="property-label">Resistencias</span><span class="defense-pills">${pills}</span></div>`;
    }
    if (data.defenses.immunities && data.defenses.immunities.length > 0) {
        const pills = data.defenses.immunities.map(i => `<span class="defense-pill immunity">${linkStatusEffects(i)}</span>`).join('');
        html += `<div class="property-line"><span class="property-label">Inmunidades</span><span class="defense-pills">${pills}</span></div>`;
    }
    if (data.defenses.vulnerabilities && data.defenses.vulnerabilities.length > 0) {
        const pills = data.defenses.vulnerabilities.map(v => `<span class="defense-pill vulnerability">${v}</span>`).join('');
        html += `<div class="property-line"><span class="property-label">Vulnerabilidades</span><span class="defense-pills">${pills}</span></div>`;
    }
    if (data.senses && data.senses.length > 0) {
        const sensesText = Array.isArray(data.senses) ? data.senses.join(', ') : data.senses;
        html += `<div class="property-line"><span class="property-label">Sentidos</span>${sensesText}</div>`;
    }
    if (data.combat.speed) {
        html += `<div class="property-line"><span class="property-label">Velocidad</span>${data.combat.speed}</div>`;
    }
    if (data.languages && data.languages.length > 0) {
        html += `<div class="property-line"><span class="property-label">Idiomas</span>${data.languages.join(', ')}</div>`;
    }
    propertiesContainer.innerHTML = html;
}

// ── ACTION / REACTION RENDERERS ──────────────────────────────────────────────

function renderAction(action, isNewFormat) {
    let html = `<div class="action-block">`;

    // Name + cost
    if (isNewFormat && typeof action.cost === 'number') {
        const costStr = action.cost > 0 ? ` (${action.cost})` : '';
        html += `<span class="action-name">${action.name}${costStr}</span>: `;
    } else {
        let headerParts = [];
        if (action.cost) headerParts.push(action.cost);
        if (action.tags && action.tags.length > 0) headerParts.push(action.tags.join(', '));
        if (action.recharge) headerParts.push(`Recarga ${action.recharge}`);
        html += `<span class="action-name">${action.name}</span>`;
        if (headerParts.length > 0) html += ` (${headerParts.join('; ')})`;
        html += ': ';
    }

    // Number of attacks
    if (action.attacks && action.attacks > 1) {
        html += `<strong>${action.attacks} ataques:</strong> `;
    }

    // Attack bonus
    if (action.bonus) {
        html += `<span class="attack-bonus">${formatDice(action.bonus)}</span> para impactar, `;
    }

    // Reach / Range
    if (action.reach) html += `alcance ${action.reach}, `;
    if (action.range) html += `alcance ${action.range}, `;

    // Area
    if (action.area) html += `${action.area}, `;

    // Save
    if (action.save) html += `<strong>Salvación:</strong> <span class="save-hl">${action.save}</span>. `;

    // Damage
    if (action.damage) {
        // + the extra damage its passives add (counted apart for umbrales)
        const extra = (action.extra_damage || []).map(x =>
            ` + <span class="damage" title="${x.source || ''}">${formatDice(x.dice)} ${x.type}</span>`).join('');
        html += `<span class="damage">${formatDice(action.damage)}</span>${extra}. `;
    }

    // Description
    if (action.desc) {
        html += `<span class="action-desc">${linkStatusEffects(parseInlineMarkdown(highlightCombatText(action.desc)))}</span>`;
    }

    // Movement
    if (action.move != null && action.move !== '') {
        const moveText = ` Se mueve ${action.move} casillas`;
        html += `<span class="action-move">${moveText}.</span> `;
    }

    html += '</div>';
    return html;
}

function renderReaction(reaction, isNewFormat) {
    let html = `<div class="action-block">`;

    if (isNewFormat && typeof reaction.cost === 'number') {
        const costStr = reaction.cost > 0 ? ` (${reaction.cost})` : '';
        const freeTag = reaction.cost === 0 ? ' <span class="free-tag">libre</span>' : '';
        html += `<span class="action-name">${reaction.name}${costStr}</span>${freeTag}: `;
    } else {
        let headerParts = [];
        if (reaction.cost) headerParts.push(reaction.cost);
        if (reaction.tags && reaction.tags.length > 0) headerParts.push(reaction.tags.join(', '));
        html += `<span class="action-name">${reaction.name}</span>`;
        if (headerParts.length > 0) html += ` (${headerParts.join('; ')})`;
        html += ': ';
    }

    if (reaction.bonus) {
        html += `<span class="attack-bonus"> ${formatDice(reaction.bonus)}</span> para defenderse. `;
    }
    if (reaction.desc) {
        html += `<span class="action-desc"> ${linkStatusEffects(parseInlineMarkdown(highlightCombatText(reaction.desc)))}</span>`;
    }
    if (reaction.move != null && reaction.move !== '') {
        const moveText = typeof reaction.move === 'number' ? `Se mueve ${reaction.move} casillas` : reaction.move;
        html += `<span class="action-move"> ${moveText}.</span> `;
    }

    html += '</div>';
    return html;
}
