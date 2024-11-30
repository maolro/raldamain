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
        mytalents: {},
        ranks: {},
        myranks: [],
        archetypes: {},
        myarch: [],
        attributes: {},
        eqList: {
            armor: {},
            weapons: {},
            head: {},
            bag: []
        },
        equipment: {
            armor: {},
            mainHand: {},
            secondHand: {},
            head: {},
            bag: []
        },
        eqAtb: {},
        myspells: {},
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
                    this[obj] = data;   // Assign the parsed data to the property
                })
                .catch(error => {
                    console.error("Error fetching the JSON: ", error);
                });
        },
        getMod: function (talid) {
            if(!(talid in this.mytalents))
                return 0;
            mainstat = this.getMainStat(this.talents[talid].stat);
            if (this.finalStats[mainstat].value == "-")
                return "-";
            return this.mytalents[talid].level + this.finalStats[mainstat].value;
        },
        getMainStat: function (statstring) {
            res = statstring;
            if (statstring.includes("/")) {
                stv = statstring.split("/");
                if (this.finalStats[stv[0]].value < this.finalStats[stv[1]].value
                    || this.finalStats[stv[0]].value == "-") {
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
                if (id == this.myranks[i].id && this.myranks[i].rank > res1) {
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
            if (stat != "-")
                result = result.replace(/MOD/g, (rk + stat));
            else
                result = result.replace(/MOD/g, "NaN");
            const operationPattern = /(\d+)([\+\-\x\/])(\d+)/g;
            const complexPattern = /\((\d+)([\+\-\x\/])(\d+)\)x(\d+)/g;
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
            result = result.replace(complexPattern, (match, left, operator, right, multiplier) => {
                const innerResult = calculateOperation(match, left, operator, right);
                return innerResult * parseInt(multiplier);
            });
            result = result.replace(operationPattern, calculateOperation);
            return result;
        },
        atbCatString: function (cat) {
            let obArray = this.myatb[cat];
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
                if (this.talstring)
                    ms.push(`**Talentos:** ${this.talstring}"`);
                if (this.rkString)
                    ms.push(`**Rangos:** ${this.rkString}`);
                if (this.arcString)
                    ms.push(`**Arquetipos:** ${this.arcString}`);
                if (this.resistances.resistances)
                    ms.push(`**Resistencias:** ${this.resistances.resistances}`);
                if (this.resistances.supresist)
                    ms.push(`**Resistencias Superiores:** ${this.resistances.supresist}`);
                if (this.resistances.immunities)
                    ms.push(`**Inmunidades:** ${this.resistances.immunities}`);
                if (this.resistances.vulnerabilities)
                    ms.push(`**Vulnerabilidades:** ${this.resistances.vulnerabilities}`);
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
                    cost = cost.replace(/(\s*(y|o)?\s*\d+\s*(Chi|Vigor)\s*(o\s*(Chi|Vigor))?)/g, '').trim();
                    uses = "1/Ronda";
                }
                attributeObject.cost = cost;
                attributeObject.uses = uses;
            }
            return attributeObject;
        },
        saveCharacter() {
            const character = {
                name: this.charactername,
                level: this.level,
                race: this.race,
                stats: this.stats,
                talents: this.mytalents,
                ranks: this.myranks,
                spells: this.myspells,
                equipment: this.equipment,
                archetypes: this.myarch,
            };
            let user = localStorage.getItem("currentUser");
            if (user) {
                let userCharacters = JSON.parse(localStorage.getItem("userCharacters")) || {};
                if (!(user in userCharacters))
                    userCharacters[user] = [];
                // Check if there is a current character already saved
                const currentCharacterName = character.name;
                const existingCharacterIndex = userCharacters[user].findIndex(char => char.name === currentCharacterName);

                if (existingCharacterIndex !== -1) {
                    // Replace the existing character's data with the new one
                    userCharacters[user][existingCharacterIndex] = character;
                    alert('Personaje actualizado exitosamente!');
                } else {
                    // Add new character to the array
                    userCharacters[user].push(character);
                    alert('Personaje guardado exitosamente!');
                }

                // Save the updated characters list back to localStorage
                localStorage.setItem("userCharacters", JSON.stringify(userCharacters));
                window.location.href = "index.html";
            }
            else {
                localStorage.setItem("tempCharacter", character);
                window.location.href = "login.html"; //redirect to login
            }
        },
        loadCharacter(character) {
            this.charactername = character["name"];
            this.level = character["level"];
            this.race = character["race"];
            this.stats = character["stats"];
            this.mytalents = character["talents"];
            this.myranks = character["ranks"];
            this.myspells = character["spells"];
            this.equipment = character["equipment"];
            this.myarch = character["archetypes"];
        }
    },
    computed: {
        hp: function () {
            let hpstat;
            if (this.finalStats.con.value != "-")
                hpstat = this.finalStats.con.value;
            else
                hpstat = this.finalStats.cha.value;
            return Math.floor(3 + (this.level - 1) / 3 + hpstat + this.sumAllKeys('hp', this.myatb.passive));
        },
        vt: function () {
            let vtstat;
            if (this.finalStats.con.value != "-")
                vtstat = this.finalStats.con.value;
            else
                vtstat = this.finalStats.cha.value;
            return (2 + this.level / 1 + vtstat + this.sumAllKeys('vt', this.myatb.passive));
        },
        san: function () {
            if (this.finalStats.itl.value == "-")
                return "-";
            return (2 + this.level / 1 + this.finalStats.itl.value);
        },
        talstring: function () {
            ts = [];
            for (let key in this.mytalents) {
                if (this.mytalents[key].level > 0) {
                    ts.push((this.mytalents[key].name + " + " + this.getMod(key)));
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
        resistances: function () {
            let rsobj = { vulnerabilities: [], resistances: [], supresist: [], immunities: [] };

            for (let i in this.myatb["passive"]) {
                let ab = this.myatb.passive[i];
                if ("resistances" in ab) {
                    for (let j in ab.resistances) {
                        let rs = ab.resistances[j];
                        if (rsobj.resistances.includes(rs)) {
                            rsobj.resistances.splice(rsobj.resistances.indexOf(rs), 1);
                            rsobj.supresist.push(rs);
                        }
                        else if (rsobj.supresist.includes(rs)) {
                            rsobj.supresist.splice(rsobj.supresist.indexOf(rs), 1);
                            rsobj.immunities.push(rs);
                        }
                        else if (rsobj.vulnerabilities.includes(rs)) {
                            rsobj.vulnerabilities.splice(supresist.indexOf(rs), 1);
                        }
                        else if (!rsobj.immunities.includes(rs)) {
                            rsobj.resistances.push(rs);
                        }
                    }
                }
                if ("vulnerabilities" in ab) {
                    for (let j in ab.vulnerabilities) {
                        let rs = ab.vulnerabilities[j];
                        if (rsobj.immunities.includes(rs)) {
                            rsobj.immunities.splice(rsobj.immunities.indexOf(rs), 1);
                            rsobj.supresist.push(rs);
                        }
                        else if (rsobj.supresist.includes(rs)) {
                            rsobj.supresist.splice(rsobj.supresist.indexOf(rs), 1);
                            rsobj.resistances.push(rs);
                        }
                        else if (rsobj.resistances.includes(rs)) {
                            rsobj.resistances.splice(resistances.indexOf(rs), 1);
                        }
                        else if (!rsobj.vulnerabilities.includes(rs)) {
                            rsobj.vulnerabilities.push(rs);
                        }
                    }
                }
                if ("immunities" in ab) {
                    for (let j in ab.immunities) {
                        let rs = ab.immunities[j];
                        if (rsobj.resistances.includes(rs)) {
                            rsobj.resistances.splice(rsobj.resistances.indexOf(rs), 1);
                            rsobj.immunities.push(rs);
                        }
                        else if (rsobj.supresist.includes(rs)) {
                            rsobj.supresist.splice(rsobj.supresist.indexOf(rs), 1);
                            rsobj.immunities.push(rs);
                        }
                        else if (rsobj.vulnerabilities.includes(rs)) {
                            rsobj.vulnerabilities.splice(rsobj.vulnerabilities.indexOf(rs), 1);
                            rsobj.supresist.push(rs);
                        }
                        else if (!rsobj.immunities.includes(rs)) {
                            rsobj.immunities.push(rs);
                        }
                    }
                }
                if ("supresist" in ab) {
                    for (let j in ab.vulnerabilities) {
                        let rs = ab.resistances[j];
                        if (rsobj.resistances.includes(rs)) {
                            rsobj.resistances.splice(rsobj.resistances.indexOf(rs), 1);
                            rsobj.immunities.push(rs);
                        }
                        else if (rsobj.supresist.includes(rs)) {
                            rsobj.supresist.splice(rsobj.supresist.indexOf(rs), 1);
                            rsobj.immunities.push(rs);
                        }
                        else if (rsobj.vulnerabilities.includes(rs)) {
                            rsobj.vulnerabilities.splice(rsobj.vulnerabilities.indexOf(rs), 1);
                            rsobj.resistances.push(rs);
                        }
                        else if (!rsobj.immunities.includes(rs)) {
                            rsobj.supresist.push(rs);
                        }
                    }
                }
            }
            return {
                vulnerabilities: rsobj.vulnerabilities.join(", "),
                resistances: rsobj.resistances.join(", "),
                supresist: rsobj.supresist.join(", "),
                immunities: rsobj.immunities.join(", ")
            };
        },
        myatb: function () {
            let res = { passive: [], actions: [], reactions: [] };
            let abSwitch = (ability) => {
                switch (ability.type) {
                    case "Pasiva":
                        if (!res.passive.includes(ability))
                            res.passive.push(ability);
                        break;
                    case "Accion":
                        if (!res.actions.includes(ability))
                            res.actions.push(ability);
                        break;
                    case "Reaccion":
                        if (!res.reactions.includes(ability))
                            res.reactions.push(ability);
                        break;
                }
            };
            //Add equipment abilities
            for (let key in this.equipment) {
                let slot = this.equipment[key];
                if (key != 'bag' && 'eqab' in slot) {
                    let atlist = slot.eqab.split(",");
                    for (let i in atlist) {
                        let eid = atlist[i].trim();
                        if (eid in this.eqAtb) {
                            let atb = this.eqAtb[eid];
                            if (atb.skill)
                                atb["rank"] = this.getRank(atb.skill);
                            abSwitch(atb);
                        }
                    }
                }
                else if (key == 'bag') {
                    for (let i in slot) {
                        let eid = slot[i];
                        if ('eqab' in eid && eid.eqab in this.eqAtb) {
                            abSwitch(this.eqAtb[eid.eqab]);
                        }
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
                            atb.rank = this.getRank(atb.skill);
                            abSwitch(atb);
                        }
                    }
                }
            }
            //Add archetype abilities
            for (let key in this.myarch) {
                let arc = this.myarch[key];
                let i = arc.rank;
                if ("enchancements" in arc) {
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
                                    abSwitch(this.updateCostAndUses({ ...atb }));
                                }
                            }
                        }
                        if (enh.abilities) {
                            for (let j in enh.abilities) {
                                let ab = enh.abilities[j];
                                ab["rank"] = (arc.rank + 1);
                                abSwitch(ab);
                            }
                        }
                        i--;
                    }
                }
            }
            return res;
        },
        reserves: function () {
            let chiRes = 0;
            let staminaRes = 0;
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
            chiRes += this.sumAllKeys('chi', this.myatb.passive);
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
            if (this.race.stats) {
                for (let j in this.race.stats) {
                    bst = this.race.stats[j];
                    if (bst.boost != null && statsRes[bst.stat].value != "-")
                        statsRes[bst.stat].value += bst.boost;
                    else
                        statsRes[bst.stat].value = "-";
                }
            }
            fullArr = this.myranks.concat(this.myarch);
            for (let i in fullArr) {
                rk = fullArr[i];
                for (let j in rk.stats) {
                    bst = rk.stats[j];
                    if (bst.boost != null && statsRes[bst.stat].value != "-" && bst.rank <= rk.rank)
                        statsRes[bst.stat].value += bst.boost;
                    else if (bst.boost == null)
                        statsRes[bst.stat].value = "-";
                }
            }
            if ('penalty' in this.equipment.armor && -statsRes.str.value > this.equipment.armor.penalty)
                statsRes.dex.value += this.equipment.armor.penalty;
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
        arclevels: function () {
            return this.sumAllKeys('rank', this.myarch);
        }
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
        if (localStorage.getItem("currentCharacter")) 
            this.loadCharacter(JSON.parse(localStorage.getItem("currentCharacter")));
        else
            this.getData("mytalents", './data/talents.json');
    }
});
