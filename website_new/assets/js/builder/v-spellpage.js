// =============================================
// HECHIZOS — spells learned through rank abilities
// Grants come from the rank data ("spell_grants" on an ability, edited in the rank
// editor); main.js turns them into $root.spellGrants. Picks live in $root.spellPicks,
// the higher entity (name, 3-5 domains, damage type) in $root.patron.
// =============================================

const MAX_DOMAINS = 5;
const MIN_DOMAINS = 3;
const ROMAN_NUM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

Vue.component('v-spellpage', {
    template: `
    <div class="spell-page">
        <h3 class="section-header">Hechizos</h3>

        <p v-if="!r.spellGrants.length" class="spell-empty">
            Ningún rango de tu personaje otorga hechizos todavía
            (por ejemplo Guerrero Divino I, Ascendencia Akhásica I o Ascendencia Abisal II).
        </p>

        <!-- Higher entity: god, patron or spirit -->
        <div v-if="needsPatron" class="spell-box">
            <h4 class="spell-box-title">Entidad superior</h4>
            <p class="spell-hint">Dios, patrón o espíritu del que provienen tus hechizos. Sus dominios son las ramas de magia que puedes aprender.</p>
            <input type="text" class="form-control form-control-sm mb-2" placeholder="Nombre de la entidad"
                :value="r.patron.name" @input="r.patron.name = $event.target.value">
            <div class="spell-sub">
                Dominios
                <span :class="['spell-count', domainState]">{{ r.patron.domains.length }} / {{ maxDomains }} · elige {{ minDomains }}-{{ maxDomains }}</span>
            </div>
            <div class="domain-grid">
                <label v-for="d in domainOptions" :key="d.id"
                    :class="['domain-chip', { on: r.patron.domains.includes(d.id), off: !r.patron.domains.includes(d.id) && r.patron.domains.length >= maxDomains }]">
                    <input type="checkbox" :checked="r.patron.domains.includes(d.id)"
                        :disabled="!r.patron.domains.includes(d.id) && r.patron.domains.length >= maxDomains"
                        @change="toggleDomain(d.id)">
                    {{ d.name }} <small>{{ d.category }}</small>
                </label>
            </div>
            <div class="spell-sub mt-2">Tipo de daño de la entidad
                <small class="spell-hint">(lo usan habilidades como Azote Divino)</small></div>
            <select class="form-control form-control-sm" :value="r.patron.damage_type"
                @change="r.patron.damage_type = $event.target.value">
                <option value="">—</option>
                <option v-for="t in damageTypes" :key="t" :value="t">{{ t }}</option>
            </select>
        </div>

        <!-- One box per grant -->
        <div v-for="g in r.spellGrants" :key="g.key" class="spell-box">
            <h4 class="spell-box-title">{{ g.abilityName }}
                <small>{{ g.rankName }} {{ roman(g.abilityRank) }}</small></h4>
            <p class="spell-hint">
                {{ g.count }} hechizo{{ g.count === 1 ? '' : 's' }} de Rango {{ roman(g.spellRank) }} o menos
                · {{ g.sourceText }} · se lanzan con tu modificador de {{ g.rankName }}
            </p>
            <p v-if="!g.optionCount" class="spell-warn">
                {{ g.usesPatron && !r.patron.domains.length ? 'Elige los dominios de tu entidad superior para ver los hechizos disponibles.' : 'No hay hechizos disponibles con estas condiciones.' }}
            </p>
            <div v-else v-for="i in g.count" :key="g.key + '-' + i" class="spell-slot">
                <select class="form-control form-control-sm" :value="pick(g.key, i - 1)"
                    @change="setPick(g.key, i - 1, $event.target.value)">
                    <option value="">— Elige un hechizo —</option>
                    <optgroup v-for="grp in g.groups" :key="grp.label" :label="grp.label">
                        <option v-for="o in grp.options" :key="o.id" :value="o.id"
                            :disabled="takenElsewhere(g.key, i - 1, o.id)">{{ o.name }} ({{ roman(o.rank) }})</option>
                    </optgroup>
                </select>
                <div v-if="pick(g.key, i - 1) && r.attributes[pick(g.key, i - 1)]" class="spell-desc">
                    {{ short(r.attributes[pick(g.key, i - 1)].description) }}
                </div>
            </div>
        </div>
    </div>`,
    data: function () {
        return {
            maxDomains: MAX_DOMAINS,
            minDomains: MIN_DOMAINS,
            damageTypes: ['Fuego', 'Frío', 'Eléctrico', 'Ácido', 'Sónico', 'Radiante', 'Necrótico',
                'Arcano', 'Cortante', 'Contundente', 'Perforante'],
        };
    },
    computed: {
        r: function () { return this.$root; },
        needsPatron: function () { return this.r.spellGrants.some(g => g.usesPatron); },
        domainState: function () {
            const n = this.r.patron.domains.length;
            return n >= MIN_DOMAINS && n <= MAX_DOMAINS ? 'ok' : 'low';
        },
        // Magic branches that can be a domain (ranks of the magic categories)
        domainOptions: function () {
            const magic = ['Elementalismo', 'Arcano', 'Ocultismo', 'Divino'];
            return Object.keys(this.r.ranks)
                .filter(id => magic.includes(this.r.ranks[id].category))
                .map(id => ({ id, name: this.r.ranks[id].name, category: this.r.ranks[id].category }))
                .sort((a, b) => a.name.localeCompare(b.name));
        },
    },
    methods: {
        roman: function (n) { return ROMAN_NUM[n] || String(n); },
        short: function (t) {
            const plain = String(t || '').replace(/\*\*/g, '').replace(/\n/g, ' ');
            return plain.length > 180 ? plain.slice(0, 177) + '…' : plain;
        },
        toggleDomain: function (id) {
            const d = this.r.patron.domains;
            const i = d.indexOf(id);
            if (i >= 0) d.splice(i, 1);
            else if (d.length < MAX_DOMAINS) d.push(id);
        },
        pick: function (key, i) {
            return (this.r.spellPicks[key] || [])[i] || '';
        },
        setPick: function (key, i, value) {
            const arr = (this.r.spellPicks[key] || []).slice();
            arr[i] = value;
            this.$set(this.r.spellPicks, key, arr);
        },
        // The same spell can't be learned twice
        takenElsewhere: function (key, i, id) {
            for (const k in this.r.spellPicks) {
                const arr = this.r.spellPicks[k] || [];
                for (let j = 0; j < arr.length; j++) {
                    if (arr[j] === id && !(k === key && j === i)) return true;
                }
            }
            return false;
        },
    },
});
