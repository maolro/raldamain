// Status effects to auto-link (lowercase versions for matching)
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

    // Sort by length (longest first) to avoid partial replacements
    const sortedEffects = [...STATUS_EFFECTS].sort((a, b) => b.length - a.length);

    sortedEffects.forEach(effect => {
        // Create a regex that matches the effect as a whole word (case-insensitive)
        // Using word boundaries to avoid matching partial words
        const regex = new RegExp(`\\b(${effect})\\b`, 'gi');

        processed = processed.replace(regex, (match) => {
            return `<a href="/reglas.html#efectos-de-estado" class="status-effect-link"><i>${match}</i></a>`;
        });
    });

    // Prevent double-wrapping: remove nested links/italics
    // This handles cases where text was already in italics
    processed = processed.replace(/<a([^>]*)><i>(<a[^>]*>)/g, '$2');
    processed = processed.replace(/<\/a><\/i><\/a>/g, '</a>');

    return processed;
}

document.addEventListener("DOMContentLoaded", () => {
    // NEW METHOD: Get the last part of the URL
    // Example URL: http://localhost/rangos/magia_fuego
    const path = window.location.pathname;

    // Split by '/' and remove empty strings to handle potential trailing slashes
    const segments = path.split('/').filter(part => part.length > 0);

    // The ID is the last part of the URL
    const fileId = segments[segments.length - 1];

    // Debug logging - check browser console (F12)
    console.log("URL Path:", path);
    console.log("Segments:", segments);
    console.log("Rank ID:", fileId);
    console.log("Fetching:", `/data/ranks/${fileId}.json`);

    // Fetch the JSON file
    fetch(`/data/ranks/${fileId}.json`) // Note the / at the start
        .then(response => {
            if (!response.ok) throw new Error("Rank not found");
            return response.json();
        })
        .then(data => renderRankPage(data))
        .catch(err => {
            console.error(err);
            document.getElementById("rank-title").innerText = "Rango no encontrado";
        });
});

function renderRankPage(data) {
    // A. Update Meta Tags for Social Media Previews
    if (typeof updateMetaTags === 'function') {
        updateMetaTags({
            title: `${data.title} | Raldamain Rangos`,
            description: data.description || `Explora el rango ${data.title} con todas sus habilidades y estadísticas.`,
            image: `${window.location.origin}/assets/images/ranks/${data.image}`,
            url: window.location.href,
            type: 'article'
        });
    }

    // B. Fill Hero Section
    document.getElementById("rank-title").innerText = data.title;
    
    // Set Background Image dynamically
    const hero = document.getElementById("hero-section");
    hero.style.background = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/assets/images/ranks/${data.image}') center/cover`;

    // B. Fill Meta Badges (Stats)
    const metaContainer = document.getElementById("rank-meta");
    data.stats.forEach(stat => {
        metaContainer.innerHTML += `<div class="meta-badge">${stat}</div>`;
    });

    // C. Fill Fundamentals
    document.getElementById("rank-desc").innerText = data.description;
    const fundList = document.getElementById("rank-fundamentals");
    data.fundamentals.forEach(rule => {
        fundList.innerHTML += `<li>${linkStatusEffects(rule)}</li>`;
    });

    // D. Build the Abilities (The Complex Part)
    const container = document.getElementById("abilities-container");
    
    data.levels.forEach(level => {
        // Create the "Rank Header" (e.g., Rank I)
        let levelHTML = `
            <div class="rank-section">
                <div class="rank-level-header">
                    <span class="rank-number">${level.rank}</span>
                    <span class="rank-title">${level.title}</span>
                </div>
        `;

        // Add Passive text if it exists
        if (level.passive) {
            levelHTML += `<p class="rank-passive">✦ ${linkStatusEffects(level.passive)}</p>`;
        }

        // Start Grid
        levelHTML += `<div class="ability-grid">`;

        // Loop through abilities in this rank
        level.abilities.forEach(ability => {
            levelHTML += `
                <article class="ability-card">
                    <div class="ability-header">
                        <div>
                            <h3 class="ability-title">${ability.name}</h3>
                            <span class="ability-tags">${ability.tags.join(", ")}</span>
                        </div>
                    </div>
                    
                    <div class="ability-stats">
                        ${ability.cost ? `<div class="stat-pill">Coste: <span>${ability.cost}</span></div>` : ''}
                        ${ability.range ? `<div class="stat-pill">Alcance: <span>${ability.range}</span></div>` : ''}
                        ${ability.duration ? `<div class="stat-pill">Duración: <span>${ability.duration}</span></div>` : ''}
                    </div>

                    <p class="ability-desc">
                        ${linkStatusEffects(ability.desc)}
                        ${ability.crit ? `<br><br><em style="color:#ff6b6b">Crítico:</em> ${linkStatusEffects(ability.crit)}` : ''}
                    </p>

                    ${ability.empower ? `
                    <div class="empower-box">
                        <span class="empower-label">Empoderar (1 Chi · máx. 2×):</span> ${linkStatusEffects(ability.empower)}
                    </div>` : ''}
                </article>
            `;
        });

        // Close Grid and Section
        levelHTML += `</div></div>`;
        
        // Add to page
        container.innerHTML += levelHTML;
    });
}