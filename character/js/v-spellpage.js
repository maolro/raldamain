Vue.component('v-spellpage', {
    template: `
<div class="spell-page">
    <div class="row my-2 justify-content-center">
        <h2>Hechizos</h2>
    </div>
    <!-- Divine Patron Selection -->
    <div v-if="showDivinePatron" class="row my-2 justify-content-around"">
        <b> Patrón Divino: </b>
        <v-select-search v-bind:optionsobj="divinePatrons" v-on:selected-key="setDivinePatron($event)"></v-select-search>
    </div>

    <!-- Arcane Specialization Selection -->
    <div v-if="showArcaneSpecialization" class="form-group">
        <b> Especialización Arcana: </b>
        <v-select-search v-bind:optionsobj="arcaneSpecializations" v-on:selected-key="setArcaneSpecialization($event)"></v-select-search>
    </div>

    <!-- Dynamic Spell Level Sections -->
    <div v-for="(levelSection, index) in spellSections" :key="index" class="spell-section">
      <h3>{{ getSectionTitle(levelSection) }
      }</h3>

      <!-- Button to Add Spell Selector -->
      <button @click="addSpellSelector(index)" class="btn btn-primary mb-2">[+] Añadir Hechizo</button>

      <!-- Render Spell Selectors -->
      <div v-for="(spell, spellIndex) in levelSection.spells" :key="spellIndex" class="spell-selector mb-2">
        <v-spell-selector :available-spells="filteredSpells(levelSection.cat)" v-model="spell.selectedSpell"></v-spell-selector>
      </div>
    </div>
  </div>
    `,
    props: {
        myranks: {
            type: Array,
            required: true
        },
        spellLevels: {
            type: Object,
        },
        spells: {
            type: Array,
        } // List of all available spells
    },
    data: function () {
        return {
            selectedDivinePatron: {},
            selectedArcaneSpecialization: {},
            divinePatrons: {},
            arcaneSpecializations: {},
            spellSections: [], // This will store sections based on spell levels
            typefilter: ''
        };
    },
    computed: {
        showDivinePatron: function(){
            rankMatch = ["magia-divina", "guerrero-divino", "ascendencia-abisal", "ascendencia-primigenia", "ascendencia-infernal"];
            return this.myranks.some(obj => rankMatch.includes(obj.id));
        },
        showArcaneSpecialization: function(){
            return this.myranks.some(obj => obj.id === "magia-de-evocacion");
        },
        getSpellLevels: function(){
            "[{name: string, isDivine: boolean, isArcane: boolean, spells: [{rank: 1, slots: 2}, {rank: 1, slots: 2}]}]"
        }
    },
    mounted() {
        /*this.options = Object.keys(this.optionsobj).map(key => ({
            key: key,
            name: this.optionsobj[key].name
        }));
        this.filteredOptions = this.options;*/
        this.getData("divinePatrons", '../data/divine-patrons.json');
        this.getData("arcaneSpecializations", '../data/arcane-specs.json');
    },
    methods: {
        setDivinePatron(obj){
            this.selectedDivinePatron = {id: obj.key, ...this.divinePatrons[obj.key]};
        },
        setArcaneSpec(obj){
            this.selectedArcaneSpecialization = {id: obj.key, ...this.arcaneSpecializations[obj.key]};
        },
        /* Generate spell sections based on the spellLevels and rank data
        generateSpellSections() {
            this.spellSections = [];
            this.spellLevels.forEach(level => {
                const matchingRank = this.myranks.find(r => r.rank >= level.rank && r.id.includes(level.cat));
                if (matchingRank) {
                    this.spellSections.push({
                        level: level.level,
                        slots: level.slots,
                        usedSlots: 0,
                        cat: level.cat,
                        spells: [] // Holds the selected spells for this section
                    });
                }
            });
        },
        // Add a new spell selector for a specific section
        addSpellSelector(index) {
            if (this.spellSections[index].spells.length < this.spellSections[index].slots) {
                this.spellSections[index].spells.push({ selectedSpell: null });
                this.spellSections[index].usedSlots += 1;
            }
        },
        // Return the title for each section including used/available slots
        getSectionTitle(section) {
            return `Nivel ${section.level} (${section.usedSlots}/${section.slots})`;
        },
        // Filter spells based on the category for the spell selector dropdown
        filteredSpells(cat) {
            return this.spells.filter(spell => spell.cat === cat);
        },*/
        getData: function (obj, source) {
            fetch(source)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                    return response.json(); 
                })
                .then(data => {
                    this[obj] = data;   
                })
                .catch(error => {
                    console.error("Error fetching the JSON: ", error);
                });
        },
    },
    watch: {
        myranks: {
            handler: function (newVal) {
                this.myranks = newVal;
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