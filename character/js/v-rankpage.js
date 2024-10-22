Vue.component('v-rankpage', {
    template: `
<div>
    <div class="row my-2 justify-content-center">
        <b class="mr-1">Puntos a distribuir:</b>{{ rkpoints }}
    </div>
    <div v-for="(value, index) in myranks" :key="index">
        <v-rank-selecter v-bind:ranks="ranks" :index="index" :limit="ranklimit" :enableval="rkpoints"
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
        ranklimit: {
            type: Number
        }
    },
    computed: {
        myranks: function() {
            return this.$root.myranks;
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
        ranklimit: {
            handler: function (newVal) {
                this.ranklimit = newVal;
            }
        },
        ranks: {
            handler: function (newVal) {
                this.ranks = newVal;
            }
        },
    },
});