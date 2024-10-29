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
        v-on:selected-key="setArcaneSpecialization($event)"></v-select-search>
    </div>

    <!-- Dynamic Spell Level Sections -->
    <div v-for="(value, key, rowIndex) in spellSections" v-if="value.slots > 0" class="mb-4">
        <h3>{{ key }} ({{ value.slots }} ranuras)</h3>
        <div v-for="(n, colIndex) in value.options" class="mb-2">
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
        }
    },
    data: function () {
        return {
            selectedDivinePatron:{},
            selectedArcaneSpecialization: {},
            divineRanks: ["magia-divina", "guerrero-divino", "ascendencia-abisal", 
                "ascendencia-primigenia", "ascendencia-infernal"],
            myspells: {},
        };
    },
    computed: {
        showDivinePatron: function(){
            return this.myranks.some(obj => this.divineRanks.includes(obj.id));
        },
        showArcaneSpecialization: function(){
            return this.myranks.some(obj => obj.id === "magia-de-evocacion");
        },
        spellSections: function(){
            spellsect = {
                "Rango I": {slots: 0, options: [], atb: []},
                "Rango II": {slots: 0, options: [], atb: []},
                "Rango III": {slots: 0, options: [], atb: []},
                "Rango IV": {slots: 0, options: [], atb: []},
                "Rango V": {slots: 0, options: [], atb: []}
            }
            this.myranks.forEach(rank => {
                if (rank.spells) {
                    console.log("rank has spells");
                    rank.spells.forEach(spell => {
                    if (spell.rank <= rank.rank) {
                        console.log("adding spells");
                        switch(spell.rank){
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
                        spellsect[key].slots += spell.slots;
                        spellsect[key].options.push(spell.cat);
                        spellsect[key].atb.push(this.getSpellOptions(spell.cat, spell.rank, this.attributes));
                    }
                  });
                }
            });
            return spellsect;
        },
    },
    methods: {
        setDivinePatron(obj){
            this.selectedDivinePatron = {id: obj.key, ...this.divpatrons[obj.key]};
        },
        setArcaneSpec(obj){
            this.selectedArcaneSpecialization = {id: obj.key, ...this.arcspecs[obj.key]};
        },
        getSpellOptions(cat, level, atbList){
            console.log(level);
            res = {};
            avRanks = [];
            if(this.divineRanks.includes(cat) && "domains" in this.selectedDivinePatron){
                console.log("adding divine available ranks");
                avRanks = this.selectedDivinePatron.domains;
            }
            else if(cat == "magia-de-evocacion" && "magics" in this.selectedArcaneSpecialization){
                console.log("adding arcane available ranks");
                avRanks = this.selectedArcaneSpecialization.id.magics;
            }
            else{
                avRanks.push(cat);
            }
            for(let i of Object.keys(atbList)){
                atb = atbList[i];
                if (avRanks.includes(atb.skill) && atb.rank == level) {
                    res[i] = atb;
                }
            }
            return res;
        },
        addSpell(spell, x, y, cat){
            key = "spell"+x+y;
            atb = this.attributes[spell];
            atb.skill = cat;
            this.myspells[key] = atb;
            this.$emit('new-spell', this.myspells);
        },
    },
    watch: {
        myranks: {
            handler: function (newVal) {
                this.myranks = newVal;
                this.myspells = {};
                this.$emit('new-spell', this.myspells);
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
            }
        },
        arcspecs: {
            handler: function (newVal) {
                this.arcspecs = newVal;
            }
        }
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