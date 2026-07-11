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
        .then(data => renderCreaturePage(data))
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

function renderCreaturePage(data) {
    // A. Meta tags
    if (typeof updateMetaTags === 'function') {
        updateMetaTags({
            title: `${data.name} | Raldamain Bestiario`,
            description: `${data.type} ${data.tier ? '· ' + data.tier : (data.level ? 'de nivel ' + data.level : '')}. ${data.lore ? data.lore.substring(0, 150) + '...' : ''}`,
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
    hero.style.background = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/assets/images/creatures/${data.id}.jpg') center/cover`;

    // C. Meta badges
    const metaContainer = document.getElementById("creature-meta");
    const levelBadge = data.tier
        ? `<div class="creature-meta-badge level">${data.tier}</div>`
        : `<div class="creature-meta-badge level">Nivel ${data.level}</div>`;
    metaContainer.innerHTML = `
        ${levelBadge}
        <div class="creature-meta-badge">${data.size}</div>
        <div class="creature-meta-badge">${data.type}</div>
    `;

    // D. Statblock header
    document.getElementById("statblock-name").innerText = data.name;
    const subtitleEl = document.getElementById("statblock-subtitle");
    if (data.level) {
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
                <span class="trait-desc">${linkStatusEffects(parseInlineMarkdown(trait.desc))}</span>
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
                <span class="action-desc">${linkStatusEffects(action.desc)}</span>
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
    if (action.save) html += `<strong>Salvación:</strong> ${action.save}. `;

    // Damage
    if (action.damage) {
        html += `<span class="damage">${formatDice(action.damage)}</span>. `;
    }

    // Description
    if (action.desc) {
        html += `<span class="action-desc">${linkStatusEffects(parseInlineMarkdown(action.desc))}</span>`;
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
        html += `<span class="action-desc"> ${linkStatusEffects(parseInlineMarkdown(reaction.desc))}</span>`;
    }
    if (reaction.move != null && reaction.move !== '') {
        const moveText = typeof reaction.move === 'number' ? `Se mueve ${reaction.move} casillas` : reaction.move;
        html += `<span class="action-move"> ${moveText}.</span> `;
    }

    html += '</div>';
    return html;
}
