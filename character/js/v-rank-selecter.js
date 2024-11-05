Vue.component('v-rank-selecter', {
    template: `
        <div class="rank-selecter border">
            <div class="row m-1 justify-content-around">
                <v-select-search v-bind:optionsobj="ranks" v-on:selected-key="setRank($event)"></v-select-search>
                <b> {{ lvltext }}: </b>
                <v-minusplusfield v-bind:value="rankLevel" :min="0" :max="max"
                :enableval="statpoints" v-on:input="setRankLevel($event)"></v-minusplusfield>
                <button class="btn btn-light" @click="removeRank">-</button>
            </div>
        </div>
    `,
    props: {
        ranks: {
            type: Object,
            required: true
        },
        index:{
            type: Number
        },
        limit:{
            type: Number
        },
        enableval:{
            type: Number
        },
        canClose:{
            type: Boolean
        },
        lvltext:{
            type: String,
            default: "Rango"
        }
    },
    data: function() {
        return {
            rkey: "",
            rankLevel: 0,
            max: 0,
            statpoints: this.enableval
        };
    },
    methods: {
        setRank: function(key) {
            this.rkey = key;
            this.max = Math.min(this.ranks[key].max, this.limit);
            this.$emit('update-rank-level', { key: this.rkey, level: this.rankLevel, index: this.index });
        },
        setRankLevel: function(newLevel){
            this.rankLevel = newLevel;
            this.$emit('update-rank-level', { key: this.rkey, level: this.rankLevel, index: this.index });
        },
        removeRank: function(){
            this.$emit('remove-rank');
        }
    },
    watch: {
        limit: {
            handler: function (newVal) {
                this.limit = newVal;
                if(this.limit < this.rankLevel){
                    this.rankLevel = 0;
                }
                this.max = this.limit;
            }
        },
        enableval: {
            handler: function (newVal) {
                this.statpoints = newVal;
            }
        }
    }
});