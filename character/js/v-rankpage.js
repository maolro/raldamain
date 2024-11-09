Vue.component('v-rankpage', {
    template: `
<div>
    <div class="row my-2 justify-content-around">
        <b class="mr-1">Rangos gratuitos:</b>
        <v-minusplusfield v-bind:value="freeranks" :min="0" :max="6"
        v-on:input="freeranks = $event"></v-minusplusfield>
    </div>
    <div class="row my-2 justify-content-center">
        <b class="mr-1">Rangos a distribuir:</b>{{ rktotal }}
    </div>
    <div v-for="(value, index) in myranks" :key="index">
        <v-rank-selecter v-bind:ranks="ranks" :index="index" :limit="ranklimit" :enableval="rktotal"
        @update-rank-level="handleRankLevelUpdate" @remove-rank="removeRank"></v-rank-selecter>
    </div>
    <div class="row my-2 justify-content-center">
        <button class="btn btn-secondary rounded-border px-3 py-1" @click="addRank">+</button>
    </div>
</div>
`,
    props: {
        ranks: {
            default: {},
            type: Object,
            required: true
        },
        rkpoints: {
            type: Number
        },
        level: {
            type: Number,
            default: 1
        }
    },
    data: function() {
        return {
            freeranks: 0,
        };
    },
    computed: {
        myranks: function() {
            return this.$root.myranks;
        },
        ranklimit() {
            return Math.floor(1 + (this.level - 1) / 3);
        },
        rktotal(){
            return (this.rkpoints + this.freeranks);
        }
    },
    methods: {
        setRank: function (key, level, index) {
            this.$set(this.myranks, index, { id: key, ...this.ranks[key] });
            this.myranks[index].rank = level;
        },
        addRank: function () {
            this.myranks.push({ rank: 0 });
        },
        removeRank: function () {
            this.myranks.pop();
        },
        handleRankLevelUpdate({ key, level, index }) {
            this.setRank(key, level, index);
        },
    },
    watch: {
        rkpoints: {
            handler: function (newVal) {
                this.rkpoints = newVal;
            }
        },
        level: {
            handler: function (newVal) {
                this.level = newVal;
            }
        },
        ranks: {
            handler: function (newVal) {
                this.ranks = newVal;
            }
        },
    },
});