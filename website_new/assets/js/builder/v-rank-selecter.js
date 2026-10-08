Vue.component('v-rank-selecter', {
    template: `
        <div class="rank-selecter border">
            <div class="row m-1 justify-content-around">
                <v-select-search v-bind:optionsobj="ranks" v-on:selected-key="setRank($event)"
                :placeholder="rkey">
                </v-select-search>
                <b> {{ lvltext }}: </b>
                <v-minusplusfield v-bind:value="rankLevel" :min="0" :max="max"
                :enableval="statpoints" v-on:input="setRankLevel($event)"></v-minusplusfield>
                <button class="btn btn-light" @click="removeRank">-</button>
            </div>
            <div v-if="unlockHint" class="row m-1 justify-content-center">
                <small class="text-muted" :title="unlockHint">{{ unlockHint }}</small>
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
        // Character level: ranks carry their own unlock schedule ("unlock": [1, 7, 13]…)
        level:{
            type: Number,
            default: 0
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
        },
        placeholder:{
            type: String,
            default: ""
        },
        baselevel:{
            type: Number,
            default: 0
        }
    },
    data: function() {
        return {
            rkey: this.placeholder,
            rankLevel: this.baselevel,
            max: 0,
            statpoints: this.enableval
        };
    },
    computed: {
        // "Iniciado · Profesional · Maestro" ranks: say when II and III unlock
        unlockHint: function() {
            const rk = this.rkey && this.ranks[this.rkey];
            if (!rk || !rk.three_tier) return '';
            const next = rk.unlock.find(l => l > this.level);
            return '3 niveles: II a nivel 7, III a nivel 13' + (next ? ` (siguiente: nivel ${next})` : '');
        }
    },
    created: function() {
        this.max = this.maxFor(this.rkey);
    },
    methods: {
        // Highest rank level available for this rank at the character's level
        maxFor: function(key) {
            const rk = key && this.ranks[key];
            if (!rk) return this.limit;
            const byLevel = (this.level && rk.unlock)
                ? rk.unlock.filter(l => l <= this.level).length
                : this.limit;
            return Math.min(rk.max || 6, byLevel);
        },
        setRank: function(key) {
            this.rkey = key;
            this.max = this.maxFor(key);
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
                this.max = this.maxFor(this.rkey);
                if(this.max < this.rankLevel){
                    this.rankLevel = this.max;  // lower it to what the level allows
                    this.$emit('update-rank-level', { key: this.rkey, level: this.rankLevel, index: this.index });
                }
            }
        },
        level: {
            handler: function () {
                this.max = this.maxFor(this.rkey);
                if(this.max < this.rankLevel){
                    this.rankLevel = this.max;  // lower it to what the level allows
                    this.$emit('update-rank-level', { key: this.rkey, level: this.rankLevel, index: this.index });
                }
            }
        },
        ranks: {
            handler: function () {
                this.max = this.maxFor(this.rkey);  // rank data (with its unlock schedule) arrived
            }
        },
        enableval: {
            handler: function (newVal) {
                this.statpoints = newVal;
            }
        }
    }
});