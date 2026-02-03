document.addEventListener("DOMContentLoaded", () => {
    // Extract ID from URL (e.g., /equipo/espada_larga)
    const path = window.location.pathname;
    const segments = path.split('/').filter(part => part.length > 0);
    const fileId = segments[segments.length - 1];

    // Debug logging - check browser console (F12)
    console.log("Equipment Loader Debug:");
    console.log("  URL Path:", path);
    console.log("  Segments:", segments);
    console.log("  File ID:", fileId);
    console.log("  Fetching:", `/data/equipment/${fileId}.json`);

    // Fetch the JSON file
    fetch(`/data/equipment/${fileId}.json`)
        .then(response => {
            if (!response.ok) throw new Error("Equipment not found");
            return response.json();
        })
        .then(data => renderEquipmentPage(data))
        .catch(err => {
            console.error(err);
            document.getElementById("equipment-title").innerText = "Equipo no encontrado";
        });
});

function renderEquipmentPage(data) {
    // A. Update Meta Tags for Social Media Previews
    if (typeof updateMetaTags === 'function') {
        updateMetaTags({
            title: `${data.name} | Raldamain Equipos`,
            description: data.description || `${data.type} - ${data.subtype}`,
            image: data.image ? `${window.location.origin}/assets/images/equipment/${data.image}` : `${window.location.origin}/assets/images/raldamain_logo.png`,
            url: window.location.href,
            type: 'article'
        });
    }

    // B. Fill Hero Section
    document.getElementById("equipment-title").innerText = data.name;

    // Set Background Image dynamically
    const hero = document.getElementById("hero-section");
    hero.style.background = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/assets/images/equipment/${data.image}') center/cover`;

    // B. Fill Meta Badges
    const metaContainer = document.getElementById("equipment-meta");
    const rarityClass = 'rarity-' + data.rarity.toLowerCase().replace(/ /g, '-');

    metaContainer.innerHTML = `
        <div class="meta-badge">${data.type}</div>
        <div class="meta-badge">${data.subtype}</div>
        <div class="rarity-badge ${rarityClass}">${data.rarity}</div>
    `;

    // C. Fill Description
    document.getElementById("equipment-description").innerText = data.description;

    // D. Fill Stats Section
    const statsContainer = document.getElementById("stats-container");
    let statsHTML = '';

    if (data.damage) {
        statsHTML += `<div class="stat-row"><span class="stat-label">Daño:</span><span class="stat-value">${data.damage}</span></div>`;
    }
    if (data.damageType) {
        statsHTML += `<div class="stat-row"><span class="stat-label">Tipo de Daño:</span><span class="stat-value">${data.damageType}</span></div>`;
    }
    if (data.defense) {
        statsHTML += `<div class="stat-row"><span class="stat-label">Defensa:</span><span class="stat-value">${data.defense}</span></div>`;
    }
    if (data.weight) {
        statsHTML += `<div class="stat-row"><span class="stat-label">Peso:</span><span class="stat-value">${data.weight}</span></div>`;
    }
    if (data.price) {
        statsHTML += `<div class="stat-row"><span class="stat-label">Precio:</span><span class="stat-value">${data.price}</span></div>`;
    }
    if (data.range) {
        statsHTML += `<div class="stat-row"><span class="stat-label">Alcance:</span><span class="stat-value">${data.range}</span></div>`;
    }
    if (data.attackBonus) {
        statsHTML += `<div class="stat-row"><span class="stat-label">Bonus de Ataque:</span><span class="stat-value">${data.attackBonus}</span></div>`;
    }
    if (data.defenseBonus) {
        statsHTML += `<div class="stat-row"><span class="stat-label">Bonus de Defensa:</span><span class="stat-value">${data.defenseBonus}</span></div>`;
    }

    statsContainer.innerHTML = statsHTML;

    // E. Fill Properties Section
    if (data.properties && data.properties.length > 0) {
        const propertiesContainer = document.getElementById("properties-container");
        let propertiesHTML = `
            <div style="background: #151515; padding: 2rem; border-radius: 8px; margin-bottom: 2rem;">
                <h2 class="section-title">Propiedades</h2>
                <ul class="property-list">
        `;

        data.properties.forEach(prop => {
            propertiesHTML += `<li>${prop}</li>`;
        });

        propertiesHTML += `</ul></div>`;
        propertiesContainer.innerHTML = propertiesHTML;
    }

    // F. Fill Abilities Section
    if (data.abilities && data.abilities.length > 0) {
        const abilitiesContainer = document.getElementById("abilities-container");
        let abilitiesHTML = `<h2 class="section-title">Habilidades Mágicas</h2>`;

        data.abilities.forEach(ability => {
            abilitiesHTML += `
                <article class="ability-card">
                    <h3 class="ability-title">${ability.name}</h3>
                    ${ability.cost ? `<p style="color: #888; margin-bottom: 10px;"><strong>Coste:</strong> ${ability.cost}</p>` : ''}
                    ${ability.uses ? `<p style="color: #888; margin-bottom: 10px;"><strong>Usos:</strong> ${ability.uses}</p>` : ''}
                    <p class="ability-desc">${ability.description}</p>
                </article>
            `;
        });

        abilitiesContainer.innerHTML = abilitiesHTML;
    }

    // G. Fill Requirements Section
    if (data.requirements || data.penalties) {
        const requirementsContainer = document.getElementById("requirements-container");
        let requirementsHTML = `
            <div style="background: #151515; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; border: 2px solid #ff6b6b;">
                <h2 class="section-title" style="color: #ff6b6b;">Requisitos y Penalizaciones</h2>
        `;

        if (data.requirements) {
            requirementsHTML += `<p style="color: #ccc; line-height: 1.8; margin-bottom: ${data.penalties ? '1rem' : '0'};"><strong style="color: var(--accent-gold);">Requisitos:</strong> ${data.requirements}</p>`;
        }

        if (data.penalties) {
            requirementsHTML += `<p style="color: #ffaaaa; line-height: 1.8;"><strong style="color: #ff6b6b;">⚠ Penalizaciones:</strong> ${data.penalties}</p>`;
        }

        requirementsHTML += `</div>`;
        requirementsContainer.innerHTML = requirementsHTML;
    }

    // H. Fill Lore Section
    if (data.lore) {
        const loreContainer = document.getElementById("lore-container");
        loreContainer.innerHTML = `
            <h2 class="section-title">Historia</h2>
            <div class="lore-section">${data.lore}</div>
        `;
    }
}
