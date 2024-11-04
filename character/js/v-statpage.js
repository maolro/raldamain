Vue.component('v-talpage', {
    template: `
    <div>
        <div class="row md-2">
            <div class="col-6">
                <input type="text" v-model="charactername" placeholder="Nombre" style="width: 100%;">
            </div>
            <div class="col-6">
                <b class="justify-content-center mr-2">Nivel: </b>
                    <input class="justify-content-center mr-2" id="numberBox" type="number" v-model="level" min=1 max=20>
                </div>
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
            type: Number
        },
        talents: {
            type: Object
        }
    },
    computed: {
        talpoints: function () {
            talSum = 0;
            for (let key in this.talents) {
                talSum += this.talents[key].level;
            }
            return (2 + 2 * parseInt(this.level) - talSum);
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