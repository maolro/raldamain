// =============================================
// CREATURE LOADER - Loads and renders creature data
// Follows patterns from rank_loader.js
// =============================================

// Status effects for auto-linking (reused from rank_loader.js)
const STATUS_EFFECTS = [
    'aturdido', 'aturdida', 'aturdidos', 'aturdidas',
    'derribado', 'derribada', 'derribados', 'derribadas',
    'tropezado', 'tropezada', 'tropezados', 'tropezadas',
    'agarrado', 'agarrada', 'agarrados', 'agarradas',
    'cegado', 'cegada', 'cegados', 'cegadas',
    'quemadura leve', 'quemadura media', 'quemadura grave',
    'veneno', 'envenenado', 'envenenada', 'envenenados', 'envenenadas',
    'paralizado', 'paralizada', 'paralizados', 'paralizadas',
    'ralentizado', 'ralentizada', 'ralentizados', 'ralentizadas',
    'inconsciente', 'inconscientes',
    'moribundo', 'moribunda', 'moribundos', 'moribundas'
];

// Function to link status effects in text
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

// Calculate ability modifier from score
function getModifier(score) {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

// Main loader on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(part => part.length > 0);
    const creatureId = segments[segments.length - 1];

    // Debug logging - check browser console (F12)
    console.log("URL Path:", path);
    console.log("Segments:", segments);
    console.log("Creature ID:", creatureId);
    console.log("Fetching:", `/data/creatures/${creatureId}.json`);

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
    // A. Set page title
    document.title = `${data.name} | Raldamain Bestiario`;

    // B. Hero Section
    document.getElementById("creature-name").innerText = data.name;
    const hero = document.getElementById("hero-section");
    hero.style.background = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/assets/images/${data.image}') center/cover`;

    // C. Meta Badges (simplified - no alignment)
    const metaContainer = document.getElementById("creature-meta");
    metaContainer.innerHTML = `
        <div class="creature-meta-badge level">Nivel ${data.level}</div>
        <div class="creature-meta-badge">${data.type}</div>
        <div class="creature-meta-badge">${data.size}</div>
    `;

    // D. Statblock Header (name only, no subtitle)
    document.getElementById("statblock-name").innerText = data.name;
    const subtitleEl = document.getElementById("statblock-subtitle");
    if (subtitleEl) subtitleEl.style.display = 'none';

    // E. Combat Stats - PV, Vitalidad, Defensa only
    const combatContainer = document.getElementById("statblock-combat");
    combatContainer.innerHTML = `
        <div class="combat-stat">
            <span class="combat-stat-label">PV</span>
            <span class="combat-stat-value">${data.combat.pv || data.combat.hp || '-'}</span>
        </div>
        <div class="combat-stat">
            <span class="combat-stat-label">Vitalidad</span>
            <span class="combat-stat-value">${data.combat.vitalidad || data.combat.hp || '-'}</span>
        </div>
        <div class="combat-stat">
            <span class="combat-stat-label">Defensa</span>
            <span class="combat-stat-value">${data.combat.defense}</span>
        </div>
    `;

    // F. Ability Scores (no modifiers, just raw values)
    const abilitiesContainer = document.getElementById("statblock-abilities");
    const statOrder = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
    abilitiesContainer.innerHTML = statOrder.map(stat => `
        <div class="ability-block">
            <span class="ability-label">${stat}</span>
            <span class="ability-score">${data.stats[stat]}</span>
        </div>
    `).join('');

    // G. Properties (Defenses, Senses, Languages)
    const propertiesContainer = document.getElementById("statblock-properties");
    let propertiesHTML = '';

    // Saving Throws (if present)
    if (data.saves) {
        const savesStr = Object.entries(data.saves).map(([k, v]) => `${k} ${v}`).join(', ');
        propertiesHTML += `<div class="property-line"><span class="property-label">Tiradas de Salvación</span> ${savesStr}</div>`;
    }

    // Skills (if present)
    if (data.skills && data.skills.length > 0) {
        propertiesHTML += `<div class="property-line"><span class="property-label">Habilidades</span> ${data.skills.join(', ')}</div>`;
    }

    // Resistances
    if (data.defenses.resistances && data.defenses.resistances.length > 0) {
        const pills = data.defenses.resistances.map(r =>
            `<span class="defense-pill resistance">${r}</span>`
        ).join('');
        propertiesHTML += `<div class="property-line"><span class="property-label">Resistencias</span> <span class="defense-pills">${pills}</span></div>`;
    }

    // Immunities
    if (data.defenses.immunities && data.defenses.immunities.length > 0) {
        const pills = data.defenses.immunities.map(i =>
            `<span class="defense-pill immunity">${linkStatusEffects(i)}</span>`
        ).join('');
        propertiesHTML += `<div class="property-line"><span class="property-label">Inmunidades</span> <span class="defense-pills">${pills}</span></div>`;
    }

    // Vulnerabilities
    if (data.defenses.vulnerabilities && data.defenses.vulnerabilities.length > 0) {
        const pills = data.defenses.vulnerabilities.map(v =>
            `<span class="defense-pill vulnerability">${v}</span>`
        ).join('');
        propertiesHTML += `<div class="property-line"><span class="property-label">Vulnerabilidades</span> <span class="defense-pills">${pills}</span></div>`;
    }

    // Senses
    if (data.senses && data.senses.length > 0) {
        propertiesHTML += `<div class="property-line"><span class="property-label">Sentidos</span> ${data.senses.join(', ')}</div>`;
    }

    // Velocidad (moved here, below Sentidos)
    if (data.combat.speed) {
        propertiesHTML += `<div class="property-line"><span class="property-label">Velocidad</span> ${data.combat.speed}</div>`;
    }

    // Languages
    if (data.languages && data.languages.length > 0) {
        propertiesHTML += `<div class="property-line"><span class="property-label">Idiomas</span> ${data.languages.join(', ')}</div>`;
    }

    propertiesContainer.innerHTML = propertiesHTML;

    // H. Traits
    const traitsContainer = document.getElementById("statblock-traits");
    const traitsSeparator = document.getElementById("traits-separator");
    if (data.traits && data.traits.length > 0) {
        traitsContainer.innerHTML = data.traits.map(trait => `
            <div class="trait-block">
                <span class="trait-name">${trait.name}.</span>
                <span class="trait-desc">${linkStatusEffects(trait.desc)}</span>
            </div>
        `).join('');
    } else {
        traitsContainer.style.display = 'none';
        traitsSeparator.style.display = 'none';
    }

    // I. Actions - with "Acciones (X)" header
    // Update the section title to show number of actions
    const actionsSectionTitle = document.querySelector('#statblock .statblock-section:not(#reactions-section):not(#legendary-section) .statblock-section-title');
    if (actionsSectionTitle && data.combat.acciones) {
        actionsSectionTitle.innerText = `Acciones (${data.combat.acciones})`;
    }

    const actionsContainer = document.getElementById("statblock-actions");
    actionsContainer.innerHTML = data.actions.map(action => {
        let actionHTML = `<div class="action-block">`;

        // Build the action header: Name (X Acciones; Tags):
        let headerParts = [];

        // Action cost
        if (action.cost) {
            headerParts.push(action.cost);
        }

        // Tags
        if (action.tags && action.tags.length > 0) {
            headerParts.push(action.tags.join(', '));
        }

        // Recharge
        if (action.recharge) {
            headerParts.push(`Recarga ${action.recharge}`);
        }

        // Format: "Action_Name (X Acciones; Tags):"
        let nameLine = `<span class="action-name">${action.name}`;
        nameLine += '</span> ';
        if (headerParts.length > 0) {
            nameLine += ` (${headerParts.join('; ')})`;
        }
        actionHTML += (nameLine+": ");

        // Attack bonus
        if (action.bonus) {
            actionHTML += `<span class="attack-bonus">${action.bonus}</span> para impactar, `;
        }

        // Reach/Range
        if (action.reach) {
            actionHTML += `alcance ${action.reach}, `;
        }
        if (action.range) {
            actionHTML += `alcance ${action.range}, `;
        }

        // Damage
        if (action.damage) {
            actionHTML += `<span class="damage">${action.damage}</span>. `;
        }

        // Area and save (for breath weapons, etc.)
        if (action.area) {
            actionHTML += `<strong>Área:</strong> ${action.area}. `;
        }
        if (action.save) {
            actionHTML += `<strong>Salvación:</strong> ${action.save}. `;
        }

        // Description (if any additional text)
        if (action.desc) {
            actionHTML += `<span class="action-desc">${linkStatusEffects(action.desc)}</span>`;
        }

        actionHTML += '</div>';
        return actionHTML;
    }).join('');

    // J. Reactions - with "Reacciones (X)" header, only if reacciones > 0
    const numReactions = data.combat.reacciones || 0;
    if (numReactions > 0 || (data.reactions && data.reactions.length > 0)) {
        const reactionsSection = document.getElementById("reactions-section");
        reactionsSection.style.display = 'block';

        // Update section title with reaction count
        const reactionsSectionTitle = reactionsSection.querySelector('.statblock-section-title');
        if (reactionsSectionTitle && numReactions > 0) {
            reactionsSectionTitle.innerText = `Reacciones (${numReactions})`;
        }

        const reactionsContainer = document.getElementById("statblock-reactions");
        if (data.reactions && data.reactions.length > 0) {
            reactionsContainer.innerHTML = data.reactions.map(reaction => {
                let reactionHTML = `<div class="action-block">`;

                // Build header parts
                let headerParts = [];

                // Reaction cost (if any)
                if (reaction.cost) {
                    headerParts.push(reaction.cost);
                }

                // Tags
                if (reaction.tags && reaction.tags.length > 0) {
                    headerParts.push(reaction.tags.join(', '));
                }

                // Format: "Reaction_Name (1 Reacción; Tags):" or "Reaction_Name (Tags):"
                let nameLine = `<span class="action-name">${reaction.name}`;
                nameLine += '</span>';
                if (headerParts.length > 0) {
                    nameLine += ` (${headerParts.join('; ')})`;
                }
                reactionHTML += (nameLine+": ");

                // Attack bonus (for parries, etc.)
                if (reaction.bonus) {
                    reactionHTML += `<span class="attack-bonus">${reaction.bonus}</span> para defenderse. `;
                }

                // Description
                if (reaction.desc) {
                    reactionHTML += `<span class="action-desc">${linkStatusEffects(reaction.desc)}</span>`;
                }

                reactionHTML += '</div>';
                return reactionHTML;
            }).join('');
        }
    }

    // K. Legendary Actions (if any)
    if (data.legendaryActions) {
        const legendarySection = document.getElementById("legendary-section");
        legendarySection.style.display = 'block';

        document.getElementById("legendary-intro").innerText =
            `${data.name} puede realizar ${data.legendaryActions.points} acciones legendarias, eligiendo entre las opciones siguientes. Solo se puede usar una opción a la vez, y solo al final del turno de otra criatura. Las acciones legendarias gastadas se recuperan al inicio de su turno.`;

        const legendaryContainer = document.getElementById("statblock-legendary");
        legendaryContainer.innerHTML = data.legendaryActions.actions.map(action => `
            <div class="legendary-action action-block">
                <span class="action-name">${action.name}</span>
                <span class="legendary-cost">(Coste: ${action.cost})</span>.
                <span class="action-desc">${linkStatusEffects(action.desc)}</span>
            </div>
        `).join('');
    }

    // L. Lore Section
    document.getElementById("lore-text").innerHTML = linkStatusEffects(data.lore);

    // M. Loot Section
    if (data.loot) {
        document.getElementById("loot-xp-value").innerText = data.loot.xp.toLocaleString();

        const lootBody = document.getElementById("loot-items");
        lootBody.innerHTML = data.loot.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.chance}</td>
            </tr>
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
