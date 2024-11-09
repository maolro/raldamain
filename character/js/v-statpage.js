Vue.component('v-statpage', {
    template: `
    <div>
        <div class="row md-2">
            <div class="col-6">
                <input type="text" v-model="charactername" placeholder="Nombre" @input="setName" 
                style="width: 100%;">
            </div>
            <div class="col-6">
                <b class="justify-content-around mr-2">Nivel: </b>
                <v-minusplusfield v-bind:value="level" :min="1" :max="20" v-on:input="setLevel"></v-minusplusfield>
            </div>
        </div>
        <div class="row my-2 mx-2 justify-content-around">
            <b class="mr-1">Raza:</b>
                <v-select-search v-bind:optionsobj="races" :placeholder="placeholder"
                    v-on:selected-key="setRace($event)"></v-select-search>
            </div>
            <div class="row my-2 justify-content-center">
                <b class="mr-1">Puntos a distribuir:</b>{{ statpoints }}
            </div>
            <div v-for="(value, name) in stats" class="row my-2">
                <div class="col-6 justify-content-center">
                    <b>{{ value.name }}</b>
                </div>
                <div class="col-6 justify-content-center">
                    <v-minusplusfield v-bind:value="value.value" :min="-1" :max="statlimit"
                        :enableval="statpoints" v-on:input="value.value = $event"></v-minusplusfield>
                </div>
            </div>
     </div>`,
    props: {
        level: {
            type: Number,
        },
        charactername: {
            type: String
        },
        races: {
            type: Object
        },
        stats:{
            type: Object
        },
        arclevels: {
            type: Number
        },
    },
    data: function () {
        return {
            placeholder: 'Humano'
        };
    },
    computed: {
        statpoints: function () {
            statSum = 0;
            for (let key in this.stats) {
                statSum += this.stats[key].value;
            }
            return 10 + parseInt(this.level) - statSum - this.arclevels*2;
        },
        statlimit: function () {
            return Math.max(Math.floor((3 + this.level - this.arclevels*2) / 3), 3);
        },
    },
    methods: {
        setRace(id){
            if(id in this.races){
                this.$emit('set-race', this.races[id]);
            }
        },
        setLevel(value){
            this.$emit('set-level', value);
        },
        setName(event){
            this.$emit('set-name', event.target.value);
        }
    },
    watch: {
        races: {
            handler: function (newVal) {
                this.races = newVal;
            }
        },
        arclevels: {
            handler: function (newVal) {
                this.arclevels = newVal;
            }
        },
    }
});