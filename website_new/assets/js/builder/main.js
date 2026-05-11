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
        loadRanksFromWebsite: function () {
            const statNameMap = {
                'Fuerza': 'str', 'Destreza': 'dex', 'Constitución': 'con',
                'Inteligencia': 'itl', 'Sabiduría': 'wis', 'Carisma': 'cha',
                'FUE': 'str', 'DES': 'dex', 'CON': 'con',
                'INT': 'itl', 'SAB': 'wis', 'CAR': 'cha',
                'Constitucion': 'con', 'Sabiduria': 'wis'
            };
            const romanToNum = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6 };
            const toKebab = (name) => {
                return name.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '-');
            };
            const getTypeFromTags = (tags) => {
                if (!tags || tags.length === 0) return 'Pasiva';
                if (tags.includes('Pasiva')) return 'Pasiva';
                if (tags.includes('Reacción')) return 'Reaccion';
                return 'Accion';
            };
            const getReserve = () => 'chi';
            const getMainStat = (statsArr) => {
                if (!statsArr || statsArr.length === 0) return 'cha';
                for (let s of statsArr) {
                    if (s.includes('/')) {
                        let parts = s.split('/').map(p => statNameMap[p.trim()]).filter(Boolean);
                        if (parts.length > 0) return parts.join('/');
                    }
                    if (statNameMap[s]) return statNameMap[s];
                }
                return 'cha';
            };
            const parseStatBoosts = (levels) => {
                let boosts = [];
                const boostPattern = /(?:Aumenta|Incrementa).*?estad[ií]stica\s+de\s+([\w\u00C0-\u024F]+).*?(?:en|por)\s+\+?(\d+)/i;
                const shortBoostPattern = /(?:Aumenta|Incrementa)\s+(?:tu\s+)?(?:estad[ií]stica\s+de\s+)?([\w\u00C0-\u024F]+).*?(?:en|por)\s+\+?(\d+)/i;
                for (let level of levels) {
                    if (level.passive) {
                        let text = level.passive;
                        let rankNum = romanToNum[level.rank] || 1;
                        let match = text.match(boostPattern) || text.match(shortBoostPattern);
                        if (match) {
                            let statName = match[1];
                            let mapped = statNameMap[statName];
                            if (mapped) {
                                boosts.push({ stat: mapped, rank: rankNum, boost: parseInt(match[2]) || 1 });
                            }
                        }
                    }
                }
                return boosts.length > 0 ? boosts : undefined;
            };

            const vm = this;
            fetch('/data/ranks_list.json')
                .then(r => r.json())
                .then(rankList => {
                    let promises = rankList.map(entry => {
                        return fetch('/data/ranks/' + entry.id + '.json')
                            .then(r => r.json())
                            .then(rankData => {
                                let rankId = rankData.id;
                                let attributeIds = [];

                                for (let level of (rankData.levels || [])) {
                                    let rankNum = romanToNum[level.rank] || 1;
                                    for (let ability of (level.abilities || [])) {
                                        let atbId = toKebab(ability.name);
                                        attributeIds.push(atbId);
                                        if (!(atbId in vm.attributes)) {
                                            let type = getTypeFromTags(ability.tags);
                                            let allTags = (ability.tags || []).join(', ');
                                            vm.$set(vm.attributes, atbId, {
                                                name: ability.name,
                                                type: type,
                                                description: ability.desc || '',
                                                rank: rankNum,
                                                skill: rankId,
                                                cost: ability.cost || '',
                                                uses: ability.uses || '',
                                                tags: allTags,
                                                empower: ability.empower || '',
                                                range: ability.range || '',
                                                area: ability.area || '',
                                                duration: ability.duration || '',
                                                crit: ability.crit || '',
                                                ...(ability.def  !== undefined ? { def:  ability.def  } : {}),
                                                ...(ability.hp   !== undefined ? { hp:   ability.hp   } : {}),
                                                ...(ability.vt   !== undefined ? { vt:   ability.vt   } : {}),
                                                ...(ability.chi  !== undefined ? { chi:  ability.chi  } : {}),
                                            });
                                        }
                                    }
                                }

                                let statsArr = rankData.stats || [];
                                let statBoosts = parseStatBoosts(rankData.levels || []);
                                let rankEntry = {
                                    name: rankData.title,
                                    category: entry.category,
                                    stat: getMainStat(statsArr),
                                    reserve: getReserve(),
                                    rank: 0,
                                    freeranks: 0,
                                    max: rankData.levels ? rankData.levels.length : 6,
                                    attributes: attributeIds.join(',')
                                };
                                if (statBoosts) rankEntry.stats = statBoosts;

                                // Spell grants for ascendencia ranks
                                const ascSpells = {
                                    'ascendencia_abisal': [
                                        {rank: 2, "spell-lvl": 1, slots: 2, cat: "patron-domains", mod: "ascendencia_abisal"},
                                        {rank: 4, "spell-lvl": 2, slots: 2, cat: "patron-domains", mod: "ascendencia_abisal"},
                                        {rank: 6, "spell-lvl": 3, slots: 2, cat: "patron-domains", mod: "ascendencia_abisal"}
                                    ],
                                    'ascendencia_infernal': [
                                        {rank: 1, "spell-lvl": 1, slots: 2, cat: "patron-domains", mod: "ascendencia_infernal"},
                                        {rank: 3, "spell-lvl": 2, slots: 2, cat: "patron-domains", mod: "ascendencia_infernal"},
                                        {rank: 5, "spell-lvl": 3, slots: 2, cat: "patron-domains", mod: "ascendencia_infernal"}
                                    ],
                                    'ascendencia_akhasica': [
                                        {rank: 1, "spell-lvl": 1, slots: 2, cat: "patron-domains", mod: "ascendencia_akhasica"},
                                        {rank: 3, "spell-lvl": 2, slots: 2, cat: "patron-domains", mod: "ascendencia_akhasica"},
                                        {rank: 5, "spell-lvl": 3, slots: 2, cat: "patron-domains", mod: "ascendencia_akhasica"}
                                    ],
                                    'ascendencia_primigenia': [
                                        {rank: 2, "spell-lvl": 1, slots: 2, cat: "patron-domains", mod: "ascendencia_primigenia"},
                                        {rank: 4, "spell-lvl": 2, slots: 2, cat: "patron-domains", mod: "ascendencia_primigenia"},
                                        {rank: 6, "spell-lvl": 3, slots: 2, cat: "patron-domains", mod: "ascendencia_primigenia"}
                                    ]
                                };
                                if (rankId in ascSpells) {
                                    rankEntry.spells = ascSpells[rankId];
                                }

                                return { id: rankId, entry: rankEntry };
                            })
                            .catch(err => {
                                console.warn('Could not load rank: ' + entry.id, err);
                                return null;
                            });
                    });

                    Promise.all(promises).then(results => {
                        let ranks = {};
                        for (let r of results) {
                            if (r) ranks[r.id] = r.entry;
                        }
                        vm.ranks = ranks;
                    });
                })
                .catch(err => console.error('Error loading ranks list:', err));
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
            if (!(skill in this.ranks)) return str;
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
            const getEmpowerCost = () => '1 chi';
            return obArray.map(obj => {
                let formattedString = `<b>${obj.name}</b>`;
                // Build parenthetical: (tags; cost)
                let parenParts = [];
                if (obj.tags) parenParts.push(obj.tags);
                if (obj.cost) parenParts.push(obj.cost);
                if (parenParts.length > 0)
                    formattedString += ` (${parenParts.join('; ')})`;
                // Build description with optional range/area/duration prefix
                let descParts = [];
                if (obj.range) descParts.push(obj.range);
                if (obj.area) descParts.push(obj.area);
                if (obj.duration) descParts.push(obj.duration);
                let desc = obj.skill
                    ? this.replaceTag(obj.description, obj.rank, obj.skill)
                    : obj.description;
                if (desc) descParts.push(desc);
                if (descParts.length > 0)
                    formattedString += ': ' + descParts.join(', ');
                // Crit
                if (obj.crit) {
                    let crit = obj.skill
                        ? this.replaceTag(obj.crit, obj.rank, obj.skill)
                        : obj.crit;
                    formattedString += ` Crítico: ${crit}`;
                }
                // Empower
                if (obj.empower) {
                    let empower = obj.skill
                        ? this.replaceTag(obj.empower, obj.rank, obj.skill)
                        : obj.empower;
                    formattedString += ` <i>Empoderar (${getEmpowerCost(obj.skill)}): ${empower}</i>`;
                }
                return formattedString;
            }).join("<br><br>");
        },
        formatCharacterInfo() {
            let toMd = (text) => {
                return text
                    .replace(/<br><br>/g, "\n\n")
                    .replace(/<b>(.*?)<\/b>/g, "**$1**")
                    .replace(/<i>(.*?)<\/i>/g, "_$1_")
                    .replace(/<[^>]+>/g, '');
            };
            let midSect = () => {
                let ms = [];
                if (this.talstring)
                    ms.push(`**Talentos:** ${this.talstring}`);
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
**PV:** ${this.hp}\t**Vit:** ${this.vt}\t**Def:** ${this.def}\t**Crd:** ${this.san}\t**Chi:** ${this.reserves.chi}\n
**FUE:** ${this.finalStats.str.value}\t**DES:** ${this.finalStats.dex.value}\t**CON:** ${this.finalStats.con.value}\t**INT:** ${this.finalStats.itl.value}\t**SAB:** ${this.finalStats.wis.value}\t**CAR:** ${this.finalStats.cha.value}\n
****\n
**Tiros de Salvación:** Físico ${this.savingThrows.fisico}, Voluntad ${this.savingThrows.voluntad}, Mental ${this.savingThrows.mental}\n
${midSect()}
**Acciones:** ${this.actions}
****\n
${toMd(this.atbCatString("passive"))}
****\n
${toMd(this.atbCatString("actions"))}
****\n
${toMd(this.atbCatString("reactions"))}
        `;
        },

        downloadCharacterInfo() {
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
            const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${this.charactername}.json`;
            document.body.appendChild(link);
            link.click();
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
                if (cost.includes("Chi")) {
                    cost = cost.replace(/(\s*(y|o)?\s*\d+\s*Chi)/g, '').trim();
                    uses = "1/Ronda";
                }
                attributeObject.cost = cost;
                attributeObject.uses = uses;
            }
            return attributeObject;
        },
        loadCharacterFromFile() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.txt';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const character = JSON.parse(event.target.result);
                        this.loadCharacter(character);
                    } catch (err) {
                        alert('Error al cargar el archivo: formato inválido.');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        },
        weaponMod(weapon) {
            if (!weapon || !weapon.name || !weapon.style || weapon.style === 'shield') return null;
            const str = this.finalStats.str.value;
            const dex = this.finalStats.dex.value;
            const strV = str === '-' ? -99 : str;
            const dexV = dex === '-' ? -99 : dex;
            const colosoRk   = this.getRank('estilo_coloso');
            const duelistaRk = this.getRank('estilo_duelista');
            const asesinоRk  = this.getRank('estilo_asesino');
            let mod;
            switch (weapon.style) {
                case 'heavy':   mod = strV + colosoRk; break;
                case 'duelist': mod = Math.max(strV, dexV) + duelistaRk; break;
                case 'light':
                case 'ranged':  mod = dexV + asesinоRk; break;
                case 'flex':    mod = Math.max(strV + colosoRk, Math.max(strV, dexV) + duelistaRk, dexV + asesinоRk); break;
                default:        mod = Math.max(strV, dexV); break;
            }
            return mod >= 0 ? `+${mod}` : `${mod}`;
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
                            rsobj.vulnerabilities.splice(rsobj.supresist.indexOf(rs), 1);
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
                            rsobj.resistances.splice(rsobj.resistances.indexOf(rs), 1);
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
                            let atb = { ...this.eqAtb[eid] };
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
                            let atb = { ...this.attributes[eid] };
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
                                    let atb = { ...this.attributes[eid] };
                                    atb.rank = (arc.rank + 1);
                                    abSwitch(this.updateCostAndUses(atb));
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
            for (let i in this.myranks) {
                rk = this.myranks[i];
                chiRes += rk.rank * 2;
            }
            chiRes += this.sumAllKeys('chi', this.myatb.passive);
            return { chi: chiRes };
        },
        savingThrows: function() {
            const fs = this.finalStats;
            const sum = (a, b) => (a === '-' || b === '-') ? '-' : a + b;
            const fmt = v => v === '-' ? '-' : (v >= 0 ? '+' + v : String(v));
            return {
                fisico:   fmt(sum(fs.str.value, fs.dex.value)),
                voluntad: fmt(sum(fs.con.value, fs.cha.value)),
                mental:   fmt(sum(fs.itl.value, fs.wis.value)),
            };
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
                    if (!(bst.stat in statsRes)) continue;
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
                    if (!(bst.stat in statsRes)) continue;
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
        },
        weaponString: function () {
            const slots = [
                { label: 'MP', weapon: this.equipment.mainHand },
                { label: 'MS', weapon: this.equipment.secondHand }
            ];
            const styleLabel = { heavy: 'Coloso', duelist: 'Duelista', light: 'Asesino', ranged: 'Asesino', flex: 'flex', shield: null };
            return slots
                .filter(s => s.weapon && s.weapon.name)
                .map(s => {
                    const mod = this.weaponMod(s.weapon);
                    const style = s.weapon.style ? styleLabel[s.weapon.style] : null;
                    const suffix = [mod, style ? `(${style})` : null].filter(Boolean).join(' ');
                    return suffix ? `${s.weapon.name} ${suffix}` : s.weapon.name;
                })
                .join(', ');
        }
    },
    created() {
        this.getData("talents", '/data/builder/talents.json');
        this.getData("attributes", '/data/builder/attributes.json');
        this.loadRanksFromWebsite();
        this.getData("eqList", '/data/builder/equipment.json');
        this.getData("eqAtb", '/data/builder/equipment-abilities.json');
        this.getData("races", '/data/builder/races.json');
        this.getData("divinepatrons", '/data/builder/divine-patrons.json');
        this.getData("arcanespecs", '/data/builder/arcane-specs.json');
        if (localStorage.getItem("currentCharacter"))
            this.loadCharacter(JSON.parse(localStorage.getItem("currentCharacter")));
        else
            this.getData("mytalents", '/data/builder/talents.json');
    }
});
