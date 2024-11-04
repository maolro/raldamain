Vue.component('v-spellpage', {
    template: `
<div class="spell-page" style="height: 400px; max-height: 400px; overflow-y: auto; overflow-x: hidden;">
    <div class="row my-2 justify-content-center">
        <h2>Hechizos</h2>
    </div>
    <!-- Divine Patron Selection -->
    <div v-if="showDivinePatron" class="row my-2 justify-content-around"">
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

    <!-- Dynamic Spell Level Sections -->
    <div v-for="(value, key, rowIndex) in spellSections" v-if="value.slots > 0" class="mb-4">
        <h3>{{ key }} ({{ value.slots }} ranuras)</h3>
        <div v-for="(n, colIndex) in value.skill" class="mb-2">
            <v-select-search v-bind:optionsobj="value.atb[colIndex]" 
            v-on:selected-key="addSpell($event, rowIndex, colIndex, n)"></v-select-search>
        </div> 
    </div>
  </div>
    `,
    props: {
        myranks: {
            type: Array,
            required: true
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
        race: {
            type: Object
        },
        level: {
            type: Number,
        },
    },
    data: function () {
        return {
            selectedDivinePatron: {},
            selectedArcaneSpecialization: {},
            divineRanks: ["magia-divina", "guerrero-divino", "ascendencia-abisal",
                "ascendencia-primigenia", "ascendencia-infernal"],
            myspells: {}
        };
    },
    computed: {
        showDivinePatron: function () {
            return this.myranks.some(obj => this.divineRanks.includes(obj.id));
        },
        showArcaneSpecialization: function () {
            return this.myranks.some(obj => obj.id === "magia-de-evocacion");
        },
        spellSections: function () {
            spellsect = {
                "Rango I": { slots: 0, skill: [], atb: [] },
                "Rango II": { slots: 0, skill: [], atb: [] },
                "Rango III": { slots: 0, skill: [], atb: [] },
                "Rango IV": { slots: 0, skill: [], atb: [] },
                "Rango V": { slots: 0, skill: [], atb: [] }
            }
            if(this.race.spells){
                this.spellSwitcher(spellsect, this.level, this.race.spells)
            }
            this.myranks.forEach(rank => {
                if (rank.spells) {
                    console.log("rank has spells");
                    this.spellSwitcher(spellsect, rank.rank, rank.spells)
                }
            });
            return spellsect;
        },
    },
    methods: {
        spellSwitcher(switchObj, rval, src){
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
        getSpellOptions(cat, level, atbList, divpatron, arcanespec) {
            console.log(level);
            res = {};
            avRanks = [];
            if (this.divineRanks.includes(cat) && "domains" in divpatron) {
                console.log("adding divine available ranks");
                avRanks = divpatron.domains;
            }
            else if (cat === 'magia-de-evocacion' && "magics" in arcanespec) {
                console.log("adding arcane available ranks");
                avRanks = arcanespec.magics;
            }
            else {
                avRanks.push(cat);
            }
            for (let i of Object.keys(atbList)) {
                atb = atbList[i];
                if (avRanks.includes(atb.skill) && atb.rank == level) {
                    res[i] = atb;
                }
            }
            return res;
        },
        addSpell(spell, x, y, cat) {
            const key = `spell${x}${y}`;
            const atb = this.attributes[spell];
            atb.skill = cat;
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