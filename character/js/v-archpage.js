Vue.component('v-archpage', {
    template: `
<div>
    <div class="row my-2 justify-content-center">
        <b class="mr-1">Puntos a distribuir:</b>{{ rkpoints }}
    </div>
    <div v-for="(value, index) in myarch" :key="index">
        <v-rank-selecter v-bind:ranks="archetypes" :index="index" :limit="arclimit" :enableval="(rkpoints-1)"
        @update-rank-level="handleArchLevelUpdate" @remove-rank="removeArch"></v-rank-selecter>
    </div>
    <div class="row my-2 justify-content-center">
        <button class="btn btn-secondary rounded-border px-3 py-1" @click="addArch">+</button>
    </div>
</div>
`,
    props: {
        archetypes: {
            default: {},
            type: Object,
            required: true
        },
        rkpoints: {
            type: Number
        },
        level: {
            type: Number
        }
    },
    computed: {
        myarch: function() {
            return this.$root.myarch;
        },
        arclimit() {
            if(this.level < 4)
                return 1;
            return Math.floor(this.level / 4);
        },
    },
    methods: {
        setArch: function (key, rank, index) {
            this.$set(this.myarch, index, { id: key, ...this.archetypes[key] });
            this.myarch[index].rank = rank;
        },
        addArch: function () {
            this.myarch.push({ rank: 0 });
        },
        removeArch: function () {
            this.myarch.pop();
        },
        handleArchLevelUpdate({ key, level, index }) {
            this.setArch(key, level, index);
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
        archetypes: {
            handler: function (newVal) {
                this.archetypes = newVal;
            }
        },
    },
});