Vue.component('v-spellpage', {
    template: `
<div class="spell-page" style="max-height: 400px; overflow-y: auto; overflow-x: hidden;">
    <div class="row my-2 justify-content-center">
        <h2>Hechizos</h2>
    </div>
    <!-- Divine Patron Selection -->
    <div v-if="showDivinePatron" class="row my-2 justify-content-around"">
        <b> Patrón Divino: </b>
        <v-select-search v-bind:optionsobj="formatSearch(divinePatrons)" 
        v-on:selected-key="setDivinePatron($event)"></v-select-search>
    </div>

    <!-- Arcane Specialization Selection -->
    <div v-if="showArcaneSpecialization" class="form-group">
        <b> Especialización Arcana: </b>
        <v-select-search v-bind:optionsobj="formatSearch(arcaneSpecializations)" 
        v-on:selected-key="setArcaneSpecialization($event)"></v-select-search>
    </div>

    <!-- Dynamic Spell Level Sections -->
    <div v-for="(value, key, rowIndex) in spellSections" v-if="value.slots > 0" class="mb-4">
        <h3>{{ key }} ({{ value.slots }} ranuras)</h3>
        <div v-for="(n, colIndex) in value.options" :key="key" class="mb-2">
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
        }
    },
    data: function () {
        return {
            selectedDivinePatron:{id: "shade", name: "Shade", type: "abyssal",
                domains: ["magia-sombria", "nigromancia", 
                "magia-ilusoria", "magia-mental", "magia-de-acido"]
            },
            selectedArcaneSpecialization: {},
            divinePatrons: {},
            arcaneSpecializations: {},
            divineRanks: ["magia-divina", "guerrero-divino", "ascendencia-abisal", 
                "ascendencia-primigenia", "ascendencia-infernal"],
        };
    },
    computed: {
        myspells: function() {
            return this.$root.myspells;
        },
        showDivinePatron: function(){
            return this.myranks.some(obj => this.divineRanks.includes(obj.id));
        },
        showArcaneSpecialization: function(){
            return this.myranks.some(obj => obj.id === "magia-de-evocacion");
        },
        spellSections: function(){
            spellsect = {
                "Rango I": {slots: 0, options: [], atb: [{}]},
                "Rango II": {slots: 2, options: ["magia-gravitatoria", "magia-divina"],
                    atb: [this.getSpellOptions("magia-gravitatoria", 2, this.attributes),
                        this.getSpellOptions("magia-divina", 2, this.attributes)]},
                "Rango III": {slots: 0, options: [], atb: [{}]},
                "Rango IV": {slots: 0, options: [], atb: [{}]},
                "Rango V": {slots: 0, options: [], atb: [{}]}
            }
            this.myranks.forEach(rank => {
                if (rank.spells) {
                    rank.spells.forEach(spell => {
                    if (spell.rank < rank.rank) {
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
                        spellsect[key].slots += 1;
                        options[key].push(spell.cat);
                        atb.push(this.getSpellOptions(spell.cat, spell.rank));
                    }
                  });
                }
            });
            return spellsect;
        },
    },
    mounted() {
        this.$root.getData("divinePatrons", '../data/divine-patrons.json');
        this.$root.getData("arcaneSpecializations", '../data/arcane-specs.json');
        console.log("added all json files");
    },
    methods: {
        formatSearch: function(obj){
            res = [];
            for(let i in Object.keys(obj)){
                res.push({id: i, name: obj[i].name});
            }
            return res;
        },
        setDivinePatron(obj){
            this.selectedDivinePatron = {id: obj.key, ...this.divinePatrons[obj.key]};
        },
        setArcaneSpec(obj){
            this.selectedArcaneSpecialization = {id: obj.key, ...this.arcaneSpecializations[obj.key]};
        },
        getSpellOptions(cat, level, atbList){
            console.log(level);
            res = {};
            avRanks = [];
            if(this.divineRanks.includes(cat) && "domains" in this.selectedDivinePatron){
                avRanks = this.selectedDivinePatron.domains;
            }
            else if(cat == "magia-de-evocacion" && "magics" in this.selectedArcaneSpecialization){
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
            this.$set(this.myspells, key, atb);
        },
    },
    watch: {
        myranks: {
            handler: function (newVal) {
                this.myranks = newVal;
                this.myspells = {};
            }
        },
        attributes: {
            handler: function (newVal) {
                this.attributes = newVal;
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