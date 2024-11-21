Vue.component('v-talpage', {
    template: `
    <div>
                        <div class="row my-2 justify-content-center">
                            <b class="mr-1">Puntos a distribuir:</b>{{ talpoints }}
                        </div>
                        <div style="max-height: 400px; overflow-y: auto; overflow-x: hidden;">
                            <div v-for="(value, name) in talents" class="row my-2">
                                <div class="col-6 justify-content-center">
                                    <b>{{ value.name }}</b>
                                </div>
                                <div class="col-6 justify-content-center">
                                    <v-minusplusfield v-bind:value="value.level" :min="0" :max="talentlimit"
                                        :enableval="talpoints" v-on:input="value.level = $event"></v-minusplusfield>
                                </div>
                            </div>
                        </div>
    </div>`,
    props: {
        level: {
            type: Number
        },
        talents: {
            type: Object
        },
        psatb:{
            type: Array
        }
    },
    computed: {
        talpoints: function () {
            talSum = 0;
            for (let key in this.talents) {
                talSum += this.talents[key].level;
            }
            return (2 + 2 * parseInt(this.level) - talSum + this.$root.sumAllKeys('talpoints', this.psatb));
        },
        talentlimit: function () {
            level = this.level
            if (level < 5) return 2;
            else if (level < 8) return 3;
            else if (level < 11) return 4;
            else return 5;
        },
    },
    watch: {
        level: {
            handler: function (newVal) {
                this.level = newVal;
            }
        },
        talents: {
            handler: function (newVal) {
                this.talents = newVal;
            }
        },
    }
});