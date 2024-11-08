// Define the main Vue instance
new Vue({
    el: '#app',                // Bind Vue to the element with id="app" in index.html
    components: {
        // Register custom components globally
    },
    data: {
        charactername: 'Nombre',
        level: 1,
        stats: {              // Initial attributes for a character
            str: { name: "FUE", value: 0 },
            dex: { name: "DES", value: 0 },
            con: { name: "CON", value: 0 },
            itl: { name: "INT", value: 0 },
            wis: { name: "SAB", value: 0 },
            cha: { name: "CAR", value: 0 }
        },
        talents: {},
        ranks: {},
        myranks: [],
        archetypes: {},
        myarch: [],
        attributes: {},
        eqList: {
            armor: {},
            weapons: {}
        },
        equipment: {
            armor: {},
            mainHand: {}
        },
        eqAtb: {},
        myspells: [],
        divinepatrons: {},
        arcanespecs: {},
        races: {},
        race: {},
    },
    methods: {
        updateMySpells(updatedMySpells) {
            this.myspells = updatedMySpells;
        },
        getData: function (obj, source) {
            // Fetch the JSON file from the public directory
            fetch(source)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                    return response.json(); // Parse it as a JSON object
                })
                .then(data => {
                    this[obj] = data;   // Assign the parsed data to the 'talents' property
                })
                .catch(error => {
                    console.error("Error fetching the JSON: ", error);
                });
        },
        getMod: function (talid) {
            mainstat = this.getMainStat(this.talents[talid].stat);
            return this.talents[talid].level + this.finalStats[mainstat].value;
        },
        getMainStat: function (statstring) {
            res = statstring;
            if (statstring.includes("/")) {
                stv = statstring.split("/");
                if (this.finalStats[stv[0]].value < this.finalStats[stv[1]].value) {
                    res = stv[1];
                }
                else {
                    res = stv[0]
                }
            }
            return res;
        },
        romanNum: function (num) {
            switch (num) {
                case 1: return "I";
                case 2: return "II";
                case 3: return "III";
                case 4: return "IV";
                case 5: return "V";
                case 6: return "VI";
                default: return "";
            }
        },
        getRank: function (id) {
            let res1 = 0;
            let res2 = 0;
            for (let i in this.myranks) {
                if (id == this.myranks[i].id) {
                    res1 = this.myranks[i].rank;
                    break;
                }
            }
            for (let i in this.myarch) {
                let arc = this.myarch[i];
                if ("modranks" in arc && arc.modranks.includes(id) && "rank" in arc && arc.rank > res1) {
                    res1 = (this.myarch[i].rank + 1);
                }
            }
            return Math.max(res1, res2);
        },
        replaceTag: function processString(str, rk, skill) {
            let stat = this.finalStats[this.getMainStat(this.ranks[skill].stat)].value;
            const getDD = (rk) => {
                if (rk < 3) return "d6 ";
                else if (rk < 5) return "d8 ";
                else return "d10 ";
            }
            let result = str.replace(/RANGO/g, rk)
                .replace(/STAT/g, stat)
                .replace(/DD/g, getDD(rk))
                .replace(/MOD/g, (rk + stat));
            const operationPattern = /(\d+)([\+\-\x\/])(\d+)/g;
            const calculateOperation = (match, leftOperand, operator, rightOperand) => {
                leftOperand = parseInt(leftOperand);
                rightOperand = parseInt(rightOperand);
                switch (operator) {
                    case '+':
                        return leftOperand + rightOperand;
                    case '-':
                        return leftOperand - rightOperand;
                    case 'x':
                        return leftOperand * rightOperand;
                    case '/':
                        return leftOperand / rightOperand;
                    default:
                        return match; // Return the original match if the operator is unknown
                }
            };
            result = result.replace(operationPattern, calculateOperation);
            return result;
        },
        atbCatString: function (cat) {
            obArray = this.myatb[cat];
            return obArray.map(obj => {
                let formattedString = `<b>${obj.name}</b>`;
                if (obj.cost || obj.uses || obj.tags) {
                    if (obj.uses != null)
                        obj.uses = this.replaceTag(obj.uses, obj.rank, obj.skill);
                    arr = [obj.cost, obj.uses, obj.tags];
                    formattedString += ` (${arr.filter(Boolean).join("; ")})`;
                }
                if (obj.skill)
                    formattedString += ": " + this.replaceTag(obj.description, obj.rank, obj.skill);
                else
                    formattedString += ": " + obj.description;
                if (obj.empower && (this.reserves.chi > 0 || this.reserves.stamina > 0))
                    formattedString += " " + obj.empower;
                return formattedString;
            }).join("<br></br>");
        },
        formatCharacterInfo() {
            let toMd = (text) => { return text.replace(new RegExp("<br></br>", 'g'), "\n\n") };
            let midSect = () => {
                let ms = [];
                if(this.talstring) 
                    ms.push(`**Talentos:** ${this.talstring}"`);
                if(this.rkString) 
                    ms.push(`**Rangos:** ${this.rkString}"`);
                if(this.arcString) 
                    ms.push(`**Arquetipos:** ${this.arcString}"`);
                if(this.resistances.resistances) 
                    ms.push(`**Resistencias:** ${this.resistances.resistances}"`);
                if(this.resistances.resistances) 
                    ms.push(`**Resistencias Superiores:** ${this.resistances.supresist}"`);
                if(this.resistances.resistances) 
                    ms.push(`**Inmunidades:** ${this.resistances.immunities}"`);
                if(this.resistances.resistances) 
                    ms.push(`**Vulnerabilidades:** ${this.resistances.vulnerabilities}"`);
                return ms.join('\n');
            }
            // Construct the formatted text
            return `
# ${this.charactername} (Nivel ${this.level})\n
****\n
**PV:** ${this.hp}\t**Vit:** ${this.vt}\t**Def:** ${this.def}\t**Crd:** ${this.san}\t**Vigor:** ${this.reserves.stamina}\t**Chi:** ${this.reserves.chi}\n
**FUE:** ${this.finalStats.str.value}\t**DES:** ${this.finalStats.dex.value}\t**CON:** ${this.finalStats.con.value}\t**INT:** ${this.finalStats.itl.value}\t**SAB:** ${this.finalStats.wis.value}\t**CAR:** ${this.finalStats.cha.value}\n
****\n
${midSect()}
****\n
${toMd(this.atbCatString("passive"))}
****\n
${toMd(this.atbCatString("actions"))}
****\n
${toMd(this.atbCatString("reactions"))}
        `;
        },

        downloadCharacterInfo() {
            // Get the formatted character info
            const characterInfo = this.formatCharacterInfo();

            // Create a Blob (Binary Large Object) for the file
            const blob = new Blob([characterInfo], { type: 'text/plain' });

            // Create a download link
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${this.charactername}.txt`;

            // Append the link to the body and trigger the download
            document.body.appendChild(link);
            link.click();

            // Clean up by removing the link
            document.body.removeChild(link);
        },
        addItem(slot, cat, id) {
            if (id in this.eqList[cat])
                this.equipment[slot] = this.eqList[cat][id];
            else
                this.equipment[slot] = {};
        },
        eqOptions(slot) {
            res = [];
            if (slot in this.eqList) {
                res = Object.keys(this.eqList[slot]).map(key => ({
                    key: key,
                    name: this.eqList[slot][key].name
                }));
            }
            return res;
        },
        sumAllKeys(key, arr) {
            res = 0;
            for (let i in arr) {
                val = arr[i];
                if (key in val) {
                    kr = val[key];
                    if (typeof kr === 'number')
                        res += kr;
                    else if (typeof kr === 'string' && val.skill && val.rank)
                        res += Number.parseInt(this.replaceTag(kr, val.rank, val.skill));
                    else
                        break;
                }
            }
            return res;
        },
        setRace(id) {
            if (id in this.races) {
                this.race = this.races[id];
            }
        },
        updateCostAndUses(attributeObject) {
            if (attributeObject.hasOwnProperty("cost") && attributeObject.cost !== "") {
                let cost = attributeObject.cost;
                let uses = "";
                if (cost.includes("Chi") || cost.includes("Vigor")) {
                    cost = cost.replace(/(\s*(y|o)?\s*\d+\s*(Chi|Vigor))/g, '').trim();
                    uses = "1/Ronda";
                }
                attributeObject.cost = cost;
                attributeObject.uses = uses;
            }
            return attributeObject;
        },
    },
    computed: {
        hp: function () {
            return Math.floor(3 + (this.level - 1) / 3 + this.finalStats.con.value
                + this.sumAllKeys('hp', this.myatb.passive));
        },
        vt: function () {
            return (2 + this.level / 1 + this.finalStats.con.value + this.sumAllKeys('vt', this.myatb.passive));
        },
        san: function () {
            return (2 + this.level / 1 + this.finalStats.itl.value);
        },
        talstring: function () {
            ts = [];
            for (let key in this.talents) {
                if (this.talents[key].level > 0) {
                    ts.push((this.talents[key].name + " + " + this.getMod(key)));
                    console.log(res.toString());
                }
            }
            return ts.join(", ");
        },
        rkpoints: function () {
            rkSum = 0;
            for (let key in this.myranks) {
                rkSum += this.myranks[key].rank;
            }
            for (let key in this.myarch) {
                rkSum += this.myarch[key].rank * 2;
            }
            return (1 + parseInt(this.level) - rkSum);
        },
        arcString: function () {
            let res = [];
            for (let key in this.myarch) {
                if (this.myarch[key].rank != 0)
                    res.push(this.myarch[key].name + " " + this.romanNum(this.myarch[key].rank));
            }
            return res.join(", ");
        },
        rkString: function () {
            let res = [];
            for (let key in this.myranks) {
                if (this.myranks[key].rank != 0)
                    res.push(this.myranks[key].name + " " + this.romanNum(this.myranks[key].rank));
            }
            return res.join(", ");
        },
        resistances: function(){
            let rsobj = {vulnerabilities: [], resistances: [], supresist: [], immunities: []};
            let toNextCat = (rsid, arr, place, next) => {
                if(arr.includes(rsid)){
                    arr.splice(arr.indexOf(rsid), 1);
                    next.push(rsid);
                }
                else{
                    place.push(rsid);
                }
            };
            for(let i in this.myatb["passive"]){
                let ab = this.myatb.passive[i];
                if("resistances" in ab){
                    for(let j in ab.resistances){
                        let rs = ab.resistances[j];
                        toNextCat(rs, rsobj.resistances, rsobj.resistances, rsobj.supresist);
                        toNextCat(rs, rsobj.vulnerabilities, [], []);
                        toNextCat(rs, rsobj.supresist, [], rsobj.immunities);
                    }
                }
                if("vulnerabilities" in ab){
                    for(let j in ab.vulnerabilities){
                        let rs = ab.resistances[j];
                        toNextCat(rs, rsobj.vulnerabilities, rsobj.vulnerabilities, rsobj.vulnerabilities);
                        toNextCat(rs, rsobj.resistances, [], []);
                        toNextCat(rs, rsobj.supresist, [], rsobj.resistances);
                        toNextCat(rs, rsobj.immunities, [], rsobj.supresist);
                    }
                }
                if("immunities" in ab){
                    for(let j in ab.vulnerabilities){
                        let rs = ab.resistances[j];
                        toNextCat(rs, rsobj.immunities, rsobj.immunities, rsobj.immunities);
                        toNextCat(rs, rsobj.resistances, [], rsobj.immunities);
                        toNextCat(rs, rsobj.supresist, [], rsobj.immunities);
                        toNextCat(rs, rsobj.vulnerabilities, [], rsobj.supresist);
                    }
                }
                if("supresist" in ab){
                    for(let j in ab.vulnerabilities){
                        let rs = ab.resistances[j];
                        toNextCat(rs, rsobj.supresist, rsobj.supresist, rsobj.immunities);
                        toNextCat(rs, rsobj.resistances, [], rsobj.immunities);
                        toNextCat(rs, rsobj.immunities, [], rsobj.immunities);
                        toNextCat(rs, rsobj.vulnerabilities, [], rsobj.resistances);
                    }
                }
            }
            return {vulnerabilities: rsobj.vulnerabilities.join(", "), 
                    resistances: rsobj.resistances.join(", "), 
                    supresist: rsobj.supresist.join(", "), 
                    immunities: rsobj.immunities.join(", ")};
        },
        myatb: function () {
            let res = { passive: [], actions: [], reactions: [] };
            let abSwitch = (ability) => {
                switch (ability.type) {
                    case "Pasiva": res.passive.push(ability);
                        break;
                    case "Accion": res.actions.push(ability);
                        break;
                    case "Reaccion": res.reactions.push(ability);
                        break;
                }
            };
            //Add equipment abilities
            for (let key in this.equipment) {
                let slot = this.equipment[key];
                let atlist = [];
                if ('eqab' in slot)
                    atlist = slot.eqab.split(",");
                for (let i in atlist) {
                    let eid = atlist[i].trim();
                    if (eid in this.eqAtb) {
                        let atb = this.eqAtb[eid];
                        if(atb.skill)
                            atb["rank"] = this.getRank(atb.skill);
                        abSwitch(atb);
                    }
                }
            }
            //Add racial abilities
            if ("abilities" in this.race) {
                for (let i in this.race.abilities) {
                    let atb = this.race.abilities[i];
                    if ("type" in atb)
                        abSwitch(atb);
                }
            }
            //Add spells
            for (let i in this.myspells) {
                let atb = this.myspells[i];
                if ("type" in atb)
                    abSwitch(atb);
            }
            //Add rank abilities
            for (let key in this.myranks) {
                if (this.myranks[key].rank != 0) {
                    let atlist = (this.myranks[key].attributes).split(",");
                    for (let i in atlist) {
                        let eid = atlist[i].trim();
                        if (eid in this.attributes && this.attributes[eid].rank <= this.myranks[key].rank) {
                            let atb = this.attributes[eid];
                            atb.rank = this.myranks[key].rank;
                            abSwitch(atb);
                        }
                    }
                }
            }
            //Add archetype abilities
            for (let key in this.myarch) {
                let arc = this.myarch[key];
                let i = arc.rank;
                if ("enchancements" in arc ) {
                    let enArr = arc["enchancements"];
                    while (i > 0) {
                        let pos = arc.rank - i;
                        let enh = enArr[pos];
                        if (enh.attributes) {
                            for (let j in enh.attributes) {
                                let eid = enh.attributes[j].trim();
                                if (eid in this.attributes) {
                                    let atb = this.attributes[eid];
                                    atb.rank = (arc.rank + 1);
                                    abSwitch(this.updateCostAndUses({...atb}));
                                }
                            }
                        }
                        if (enh.abilities) {
                            for (let ab in enh.abilities) {
                                abSwitch(enh.abilities[ab]);
                            }
                        }
                        i--;
                    }
                }
            }
            return res;
        },
        reserves: function () {
            chiRes = 0;
            staminaRes = 0;
            for (let i in this.myranks) {
                rk = this.myranks[i];
                switch (rk.reserve) {
                    case "chi": chiRes += rk.rank + 2;
                        break;
                    case "stamina/chi": chiRes += rk.rank;
                        staminaRes += rk.rank;
                        break;
                    case "stamina": staminaRes += rk.rank + 2;
                        break;
                }
            }
            return { chi: chiRes, stamina: staminaRes };
        },
        finalStats: function () {
            statsRes = {
                str: { name: "FUE", value: this.stats.str.value },
                dex: { name: "DES", value: this.stats.dex.value },
                con: { name: "CON", value: this.stats.con.value },
                itl: { name: "INT", value: this.stats.itl.value },
                wis: { name: "SAB", value: this.stats.wis.value },
                cha: { name: "CAR", value: this.stats.cha.value }
            };
            if ('penalty' in this.equipment.armor && -statsRes.str.value > this.equipment.armor.penalty)
                statsRes.dex.value += this.equipment.armor.penalty;
            if (this.race.stats) {
                for (let j in this.race.stats) {
                    bst = this.race.stats[j];
                    statsRes[bst.stat].value += bst.boost;
                }
            }
            fullArr = this.myranks.concat(this.myarch);
            for (let i in fullArr) {
                rk = fullArr[i];
                for (let j in rk.stats) {
                    bst = rk.stats[j];
                    if (bst.rank <= rk.rank) {
                        statsRes[bst.stat].value += bst.boost;
                    }
                }
            }
            return statsRes;
        },
        def: function () {
            res = 0;
            if (this.equipment.armor.def != null)
                res += this.equipment.armor.def;
            return res + this.sumAllKeys('def', this.myatb.passive);
        },
        actions: function () {
            return 3 + this.sumAllKeys('actions', this.myatb.passive);
        },
    },
    created() {
        this.getData("talents", './data/talents.json');
        this.getData("ranks", './data/ranks.json');
        this.getData("attributes", './data/attributes.json');
        this.getData("eqList", './data/equipment.json');
        this.getData("eqAtb", './data/equipment-abilities.json');
        this.getData("divinepatrons", './data/divine-patrons.json');
        this.getData("arcanespecs", './data/arcane-specs.json');
        this.getData("races", './data/races.json');
        this.getData("archetypes", './data/archetypes.json');
    },
    mounted() {

    }
});
