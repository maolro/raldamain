// =============================================
// CHARACTER STAT BLOCK — Impactos / Umbrales format
// Shared by the Creador (preview column) and the Mesa de Pruebas.
// Reads every value from the root builder instance (main.js).
// =============================================

// Wraps dice/modifier expressions ("+5", "+5+1d6", "2d6+4", "1d6 + 3")
// found in an HTML string with <span class="sb-dice"> (highlighted). When
// `clickable`, they also get class "rollable" + data-roll for the dice roller.
// Only text outside of tags is touched.
const ROLLABLE_RE = /(?<![\wÀ-ɏ)])(?:[+\-]?\d*d\d+|[+\-]\d+)(?:\s*[+\-]\s*\(?(?:\d*d\d+|\d+)\)?)*(?![\wÀ-ɏ])(?!\s*dados?\b)/g;

function markRollables(html, clickable = true) {
    if (!html) return html;
    return String(html).split(/(<[^>]+>)/).map(part => {
        if (part.startsWith('<')) return part;
        return part.replace(ROLLABLE_RE, m => clickable
            ? `<span class="sb-dice rollable" data-roll="${m.replace(/\s+/g, '')}" title="Tirar ${m}">${m}</span>`
            : `<span class="sb-dice">${m}</span>`);
    }).join('');
}

Vue.component('v-statblock', {
    props: {
        // Mesa de Pruebas: make dice expressions clickable
        rollable: { type: Boolean, default: false },
    },
    computed: {
        r: function () { return this.$root; },
    },
    methods: {
        h: function (html) { return markRollables(html, this.rollable); },
        saveRoll: function (v) { return String(v).replace(/\s+/g, ''); },
        // Tick boxes live inside v-html ability text, so their changes are delegated here
        onChange: function (e) {
            const t = e.target;
            if (t.classList && t.classList.contains('sb-toggle')) this.r.toggleAbility(t.dataset.toggle);
        },
    },
    template: `
    <div class="statblock-char" :class="{ 'sb-rollable': rollable }" @change="onChange">
        <div class="text-center mb-2">
            <h2>{{ r.charactername }}</h2>
            <span style="color: var(--text-muted);">Nivel {{ r.level }}</span>
        </div>
        <hr>
        <!-- Combat header: Impactos + resources (enemy-style stat block) -->
        <div class="preview-stats-row mb-2">
            <div class="col sb-hits"><b>Impactos</b><br><span class="sb-hits-value">{{ r.hits }}</span><span v-if="r.toggleBuffs.hits > 0" style="color:#28a745;font-size:11px"> (+{{ r.toggleBuffs.hits }})</span></div>
            <div class="col"><b>Chi</b><br>{{ r.reserves.chi }}</div>
            <div class="col"><b>Crd</b><br>{{ r.san }}</div>
            <div class="col"><b>Inic.</b><br>
                <span class="sb-dice" :class="{ rollable: rollable }" :data-roll="r.initiative" data-label="Iniciativa">{{ r.initiative }}</span>
            </div>
            <div v-if="r.shieldCounters > 0" class="col"><b>CE</b><br>{{ r.shieldCounters }}</div>
        </div>
        <div class="preview-stats-row mb-2">
            <div v-for="(value, name) in r.finalStats" class="col">
                <b>{{ value.name }}</b><br>{{ value.value }}
            </div>
        </div>
        <hr>
        <div class="sb-block">
            <div class="sb-block-label">Umbrales de Daño</div>
            <div class="sb-umbrales">
                <span v-for="u in r.umbrales" :key="u.categories.join()" class="sb-umbral"
                    :class="{ 'sb-umbral-general': u.categories[0] === 'General' }">
                    <span class="sb-umbral-value">{{ u.value }}</span>
                    <span class="sb-umbral-cat">{{ u.categories.join(', ') }}</span>
                </span>
            </div>
        </div>
        <div class="sb-line">
            <b>Tiros de Salvación</b>
            <span class="sb-pills">
                <span class="sb-save" :class="{ rollable: rollable }" :data-roll="saveRoll(r.savingThrows.fisico)" data-label="Salvación Física"><span class="sb-save-label">FÍS</span> <span class="sb-dice">{{ r.savingThrows.fisico }}</span><span v-if="r.saveSources.fisico" class="sb-save-src"> ({{ r.saveSources.fisico }})</span></span>
                <span class="sb-save" :class="{ rollable: rollable }" :data-roll="saveRoll(r.savingThrows.voluntad)" data-label="Salvación de Voluntad"><span class="sb-save-label">VOL</span> <span class="sb-dice">{{ r.savingThrows.voluntad }}</span><span v-if="r.saveSources.voluntad" class="sb-save-src"> ({{ r.saveSources.voluntad }})</span></span>
                <span class="sb-save" :class="{ rollable: rollable }" :data-roll="saveRoll(r.savingThrows.mental)" data-label="Salvación Mental"><span class="sb-save-label">MEN</span> <span class="sb-dice">{{ r.savingThrows.mental }}</span><span v-if="r.saveSources.mental" class="sb-save-src"> ({{ r.saveSources.mental }})</span></span>
            </span>
        </div>
        <div class="sb-line"><b>Velocidad</b> Paso 1</div>
        <hr>
        <div v-if="r.rkString" class="mb-1"><b>Rangos: </b>{{ r.rkString }}</div>
        <div v-if="r.equipmentString" class="mb-1"><b>Equipamiento: </b>{{ r.equipmentString }}</div>
        <div v-if="r.talstring" class="mb-1"><b>Talentos: </b><span v-html="h(r.talstring)"></span></div>
        <div v-if="r.arcString" class="mb-1"><b>Arquetipos: </b>{{ r.arcString }}</div>
        <div v-if="r.resistances.resistances" class="mb-1"><b>Resistencias: </b>{{ r.resistances.resistances }}</div>
        <div v-if="r.resistances.supresist" class="mb-1"><b>Resistencias Superiores: </b>{{ r.resistances.supresist }}</div>
        <div v-if="r.resistances.immunities" class="mb-1"><b>Inmune: </b>{{ r.resistances.immunities }}</div>
        <div v-if="r.resistances.vulnerabilities" class="mb-1"><b>Vulnerabilidades: </b>{{ r.resistances.vulnerabilities }}</div>
        <h3 class="sb-section-title">Pasivas</h3>
        <div v-html="h(r.atbCatString('passive'))"></div>
        <h3 class="sb-section-title">Acciones ({{ r.actions }})</h3>
        <div v-html="h(r.atbCatString('actions'))"></div>
        <h3 class="sb-section-title">Reacciones ({{ r.reactionCount }})</h3>
        <div v-html="h(r.defenseReactions)"></div>
        <div v-if="r.atbCatString('reactions')" style="margin-top:8px" v-html="h(r.atbCatString('reactions'))"></div>
        <slot></slot>
    </div>`
});
