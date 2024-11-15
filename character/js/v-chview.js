Vue.component('v-chview', {
    template: `
<div class="col-6 border" style="max-height: 500px; overflow-y: auto; overflow-x: hidden;">
    <div class="text-justify">
        <div class="row p-1 justify-content-center border-down">
            <h2>{{ charactername }} (Nivel {{ level }})</h2>
        </div>
        <hr></hr>
        <div class="row p-1">
            <div class="col"><b>PV:</b> {{ hp }}</div>
            <div class="col"><b>VT:</b> {{ vt }}</div>
            <div class="col"><b>Crd:</b> {{ san }}</div>
            <div class="col"><b>DEF:</b> {{ def }}</div>
            <div class="col"><b>Vigor:</b> {{ reserves.stamina }}</div>
            <div class="col"><b>Chi:</b> {{ reserves.chi }}</div>
        </div>
        <div class="row p-1">
            <div v-for="(value, name) in finalStats" class="col">
                <b>{{ value.name }}:</b>
                {{ value.value }}
            </div>
        </div>
        <hr></hr>
        <div v-if="talstring"><b>Talentos: </b> {{ talstring }}<br></div>
        <div v-if="rkString"><b>Rangos: </b> {{ rkString }}<br></div>
        <div v-if="arcString"><b>Arquetipos: </b> {{ arcString }}<br></div>
        <hr></hr>
        <div v-if="resistances.resistances"><b>Resistencias: </b> {{ resistances.resistances }}<br></div>
        <div v-if="resistances.supresist"><b>Resistencias Superiores: </b> {{ resistances.supresist }}<br></div>
        <div v-if="resistances.immunities"><b>Inmunidades: </b> {{ resistances.immunities }}<br></div>
        <div v-if="resistances.vulnerabilities"><b>Vulnerabilidades: </b> {{ resistances.vulnerabilities }}<br></div>
        <b>Acciones: </b>{{ actions }}<br>
        <hr></hr>
        <div v-html="atbCatString('passive')"></div>
                    <hr>
                    </hr>
                    <div v-html="atbCatString('actions')"></div>
                    <hr>
                    </hr>
                    <div v-html="atbCatString('reactions')"></div>
                    <hr>
                    </hr>
                </div>
            </div>
        </div>
`,
    props: {
        hp: {
            default: 3,
            type: Number,
        },
        vt: {
            default: 3,
            type: Number,
        },
        san: {
            default: 3,
            type: Number,
        },
        def: {
            default: 0,
            type: Number,
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
                this.$set(this.bagslots, index, {...this.eqlist['bag'][id]});
            else
                this.$set(this.bagslots, index, {});
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