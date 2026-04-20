Vue.component('v-spellpage', {
    template: `
<div class="spell-page" style="height: 400px; max-height: 400px; overflow-y: auto; overflow-x: hidden;">
    <div class="row my-2 justify-content-center">
        <h2>Hechizos</h2>
    </div>
    <!-- Divine Patron Selection -->
    <div v-if="showDivinePatron" class="row my-2 justify-content-around">
        <b> Patrón Divino: </b>
        <v-select-search v-bind:optionsobj="divpatrons"
        v-on:selected-key="setDivinePatron($event)"></v-select-search>
    </div>

    <!-- Arcane Specialization Selection -->
    <div v-if="showArcaneSpecialization" class="form-group">
        <b> Especialización Arcana: </b>
        <v-select-search v-bind:optionsobj="arcspecs"
        v-on:selected-key="setArcaneSpec($event)"></v-select-search>
    </div>

    <!-- Patron Domains Selection -->
    <div v-if="showPatronDomains" class="mb-3">
        <b>Dominios del Patrón (elige 3):</b>
        <div v-for="idx in 3" :key="'dom'+idx" class="my-1">
            <v-select-search v-bind:optionsobj="domainOptions"
            v-on:selected-key="setPatronDomain($event, idx - 1)"></v-select-search>
        </div>
    </div>

    <!-- Dynamic Spell Level Sections -->
    <div v-for="(value, key, rowIndex) in spellSections" v-if="value.slots > 0" class="mb-4">
        <h3>{{ key }} ({{ value.slots }} ranuras)</h3>
        <div v-for="(n, colIndex) in value.skill" class="mb-2">
            <v-select-search v-bind:optionsobj="value.atb[colIndex]"
            v-on:selected-key="addSpell($event, rowIndex, colIndex, n, key)"></v-select-search>
        </div>
    </div>
  </div>
    `,
    props: {
        myranks: {
            type: Array,
        },
        myarch: {
            type: Array,
        },
        attributes: {
            type: Object
        },
        divpatrons: {
            type: Object
        },
        arcspecs: {
            type: Object
        },
        ranks: {
            type: Object
        },
        race: {
            type: Object
        },
        level: {
            type: Number,
        },
        basespells:{
            type: Object,
            default: {}
        }
    },
    data: function () {
        return {
            selectedDivinePatron: {},
            selectedArcaneSpecialization: {},
            selectedPatronDomains: [],
            divineRanks: ["magia_divina", "guerrero_divino"],
            ascendenciaRanks: ["ascendencia_abisal", "ascendencia_infernal",
                "ascendencia_akhasica", "ascendencia_primigenia"],
            myspells: { ...this.basespells }
        };
    },
    computed: {
        showDivinePatron: function () {
            for(let i in this.myarch)
            {
                let arc = this.myarch[i];
                if("modranks" in arc && arc.modranks.some(modrank => this.divineRanks.includes(modrank)))
                    return true;
            }
            return this.myranks.some(obj => this.divineRanks.includes(obj.id));
        },
        showArcaneSpecialization: function () {
            for(let i in this.myarch)
            {
                let arc = this.myarch[i];
                if("modranks" in arc && arc.modranks.includes("magia_evocacion"))
                    return true;
            }
            return this.myranks.some(obj => obj.id === "magia_evocacion")
        },
        showPatronDomains: function () {
            for(let i in this.myarch)
            {
                let arc = this.myarch[i];
                if("modranks" in arc && arc.modranks.some(modrank => this.ascendenciaRanks.includes(modrank)))
                    return true;
            }
            return this.myranks.some(obj => this.ascendenciaRanks.includes(obj.id));
        },
        domainOptions: function () {
            let options = {};
            const magicCategories = ["Elementalismo", "Arcano", "Ocultismo", "Divino"];
            for (let key in this.ranks) {
                if (this.ranks[key].category && magicCategories.includes(this.ranks[key].category)) {
                    options[key] = { name: this.ranks[key].name };
                }
            }
            return options;
        },
        spellSections: function () {
            spellsect = {
                "Rango I": { slots: 0, skill: [], atb: [], isFree: []},
                "Rango II": { slots: 0, skill: [], atb: [], isFree: []},
                "Rango III": { slots: 0, skill: [], atb: [], isFree: []},
                "Rango IV": { slots: 0, skill: [], atb: [], isFree: []},
                "Rango V": { slots: 0, skill: [], atb: [], isFree: []}
            }
            if(this.race.spells){
                this.spellSwitcher(spellsect, this.level, this.race.spells, false)
            }
            this.myarch.forEach(arc => {
                if (arc.spells) {
                    this.spellSwitcher(spellsect, arc.rank, arc.spells, true)
                }
            });
            this.myranks.forEach(rank => {
                if (rank.spells) {
                    this.spellSwitcher(spellsect, rank.rank, rank.spells, false)
                }
            });
            return spellsect;
        },
    },
    methods: {
        spellSwitcher(switchObj, rval, src, isFree){
            src.forEach(spell => {
                if (spell.rank <= rval) {
                    switch (spell["spell-lvl"]) {
                        case 1: key = "Rango I";
                            break;
                        case 2: key = "Rango II";
                            break;
                        case 3: key = "Rango III";
                            break;
                        case 4: key = "Rango IV";
                            break;
                        case 5: key = "Rango V";
                            break;
                    }
                    for (let i = 0; i < spell.slots; i++) {
                        switchObj[key].slots += 1;
                        switchObj[key].skill.push(spell.mod);
                        switchObj[key].atb.push(this.getSpellOptions(spell.cat, spell["spell-lvl"], this.attributes,
                            this.selectedDivinePatron, this.selectedArcaneSpecialization));
                        switchObj[key].isFree.push(isFree);
                    }
                }
            })
        },
        setDivinePatron(obj) {
            this.selectedDivinePatron = { id: obj, ...this.divpatrons[obj] };
        },
        setArcaneSpec(obj) {
            this.selectedArcaneSpecialization = { id: obj, ...this.arcspecs[obj] };
        },
        setPatronDomain(key, index) {
            this.$set(this.selectedPatronDomains, index, key);
        },
        getSpellOptions(cat, level, atbList, divpatron, arcanespec) {
            options = {};
            avRanks = [];
            if (cat === 'patron-domains') {
                avRanks = this.selectedPatronDomains.filter(d => d);
            }
            else if (this.divineRanks.includes(cat) && "domains" in divpatron) {
                avRanks = divpatron.domains;
            }
            else if (cat === 'magia_evocacion' && "magics" in arcanespec) {
                avRanks = arcanespec.magics;
            }
            else {
                avRanks = cat;
            }
            for (let i of Object.keys(atbList)) {
                atb = atbList[i];
                let skillMatch = avRanks.includes(atb.skill);
                let rankMatch = atb.rank == level;
                let notPassive = cat === 'patron-domains' ? atb.type !== 'Pasiva' : true;
                if (skillMatch && rankMatch && notPassive) {
                    this.$set(options, i, atb);
                }
            }
            return options;
        },
        addSpell(spell, x, y, cat, spkey) {
            const key = `spell${x}${y}`;
            let atb = {...this.attributes[spell]};
            atb.skill = cat;
            if(atb.skill == "magia_divina")
                atb.tags += ", Divina";
            if(atb.skill == "magia_evocacion")
                atb.tags += ", Arcana";
            if(this.spellSections[spkey].isFree[y])
                atb = this.$root.updateCostAndUses(atb);
            this.$set(this.myspells, key, atb);
            this.$emit('update-myspells', this.myspells);
        },
    },
    watch: {
        myspells: {
            deep: true,
            handler(newMyspells) {
                this.$emit('update-myspells', newMyspells);
            },
        },
        myranks: {
            handler: function (newVal) {
                this.myranks = newVal;
                this.myspells = {};
                this.$emit("reset-selects");
            }
        },
        myarch: {
            handler: function (newVal) {
                this.myarch = newVal;
                this.myspells = {};
                this.$emit("reset-selects");
            }
        },
        attributes: {
            handler: function (newVal) {
                this.attributes = newVal;
            }
        },
        divpatrons: {
            handler: function (newVal) {
                this.divpatrons = newVal;
                this.myspells = {};
                this.$emit("reset-selects");
            }
        },
        arcspecs: {
            handler: function (newVal) {
                this.arcspecs = newVal;
                this.myspells = {};
                this.$emit("reset-selects");
            }
        },
        race: {
            handler: function (newVal) {
                this.race = newVal;
                this.myspells = {};
                this.$emit("reset-selects");
            }
        },
    },
    style:
        `.dropdown-menu {
        max-height: 200px;
        overflow-y: auto;
        padding: 0;
      }

      .dropdown-item {
        cursor: pointer;
      }

      .form-control {
        width: 100%;
        margin-bottom: 0;
      }`
});
