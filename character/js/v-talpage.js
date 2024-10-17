Vue.component('v-talpage', {
    template: `
    <!-- Hechizos Header -->
    <h2>Hechizos</h2>

    <!-- Divine Patron Selection -->
    <div v-if="showDivinePatron" class="form-group">
      <label for="divine-patron">Patrón Divino</label>
      <select v-model="selectedDivinePatron" class="form-control" id="divine-patron">
        <option v-for="patron in divinePatrons" :key="patron.key" :value="patron.key">{{ patron.name }}</option>
      </select>
    </div>

    <!-- Arcane Specialization Selection -->
    <div v-if="showArcaneSpecialization" class="form-group">
      <label for="arcane-specialization">Especialización Arcana</label>
      <select v-model="selectedArcaneSpecialization" class="form-control" id="arcane-specialization">
        <option v-for="specialization in arcaneSpecializations" :key="specialization.key" :value="specialization.key">{{ specialization.name }}</option>
      </select>
    </div>

    <!-- Dynamic Spell Level Sections -->
    <div v-for="(levelSection, index) in spellSections" :key="index" class="spell-section">
      <h3>{{ getSectionTitle(levelSection) }}</h3>

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
            type: Array
        },
        spellLevels: {
            type: Array
        },
        divinePatrons: {
            type: Array
        },
        arcaneSpecs: {
            type: Array
        },
        attributes: {
            type: Object
        },
    },
    data() {
        return {
            selectedDivinePatron: '',
            selectedArcaneSpecialization: '',
            spellSections: [] // This will store sections based on spell levels
        };
    },
    computed: {
        // Check if a divine patron should be selected based on certain ranks
        showDivinePatron() {
            const divineIds = ['guerrero-divino', 'magia-divina', 'ascendencia-abisal', 'ascendencia-infernal', 'ascendencia-primigenia'];
            return this.myranks.some(rank => divineIds.includes(rank.id));
        },
        // Check if an arcane specialization should be selected based on a certain rank
        showArcaneSpecialization() {
            return this.myranks.some(rank => rank.id === 'magia-de-evocacion');
        }
    },
    watch: {
        // Watch for changes in myranks and spellLevels to dynamically create spell sections
        myranks: {
            handler() {
                this.generateSpellSections();
            },
            deep: true,
            immediate: true
        },
        spellLevels: {
            handler() {
                this.generateSpellSections();
            },
            deep: true,
            immediate: true
        }
    },
    methods: {
        // Generate spell sections based on the spellLevels and rank data
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
        }
    }
});