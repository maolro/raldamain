Vue.component('v-equipage', {
    template: `
<div>
    <div class="row justify-content-center my-2">
        <h2>Equipamiento</h2>
    </div>
    <div class="row my-2 justify-content-center">
        <div class="col-6">
            <b>Armadura</b>
        </div>
    <div class="col-6">
        <v-select-search v-bind:optionsobj="eqlist.armor"
            v-on:selected-key="addItem('armor', 'armor', $event)">
        </v-select-search>
    </div>
    </div>
    <div class="row my-2 justify-content-center">
        <div class="col-6">
            <b>Mano Principal</b>
        </div>
        <div class="col-6">
            <v-select-search v-bind:optionsobj="eqlist.weapons"
                v-on:selected-key="addItem('mainHand', 'weapons', $event)">
            </v-select-search>
        </div>
    </div>
    <div class="row my-2 justify-content-center">
        <div class="col-6">
            <b>Bolsa</b>
        </div>
        <div class="col-6">
            <v-minusplusfield v-bind:value="bagItems" :min="0" :max="10"
            v-on:input="bagItems = $event"></v-minusplusfield>
        </div>
    </div>
    <div v-for="(value, index) in bagslots" class="mb-2">
        <v-select-search v-bind:optionsobj="eqlist.bag"
            v-on:selected-key="addBagItem($event, index)">
        </v-select-search>
    </div>
</div>
`,
    props: {
        equipment: {
            default: {},
            type: Object,
            required: true
        },
        eqlist: {
            default: {},
            type: Object,
            required: true
        },
        bagslots: {
            type: Array
        },
    },
    data: function() {
        return {
            bagItems: 0,
        };
    },
    computed: {

    },
    methods: {
        addItem(slot, cat, id) {
            if (cat in this.eqlist && id in this.eqlist[cat])
                this.equipment[slot] = this.eqlist[cat][id];
            else
                this.equipment[slot] = {};
        },
        eqOptions(slot) {
            let res = [];
            if (slot in this.eqlist) {
                res = Object.keys(this.eqlist[slot]).map(key => ({
                    key: key,
                    name: this.eqlist[slot][key].name
                }));
            }
            return res;
        },
        addBagItem(id, index){
            if(id in this.eqlist['bag'])
                this.bagslots[index] = this.eqlist['bag'][id];
            else
                this.bagslots[index] = {};
        }
    },
    watch: {
        equipment: {
            handler: function (newVal) {
                this.equipment = newVal;
            }
        },
        eqlist: {
            handler: function (newVal) {
                this.eqlist = newVal;
            }
        },
        bagslots: {
            handler: function (newVal) {
                this.bagslots = newVal;
            }
        },
        bagItems(newCount) {
            if (newCount < this.bagslots.length) {
              this.bagslots.splice(newCount);
            } 
            else {
                while (this.bagslots.length < newCount) {
                    this.bagslots.push({});
                }
            }
        }
    },
});