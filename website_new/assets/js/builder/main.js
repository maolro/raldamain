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
        activeToggles: [],
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
                                                ...(ability.def    !== undefined ? { def:    ability.def    } : {}),
                                                ...(ability.hp     !== undefined ? { hp:     ability.hp     } : {}),
                                                ...(ability.vt     !== undefined ? { vt:     ability.vt     } : {}),
                                                ...(ability.chi    !== undefined ? { chi:    ability.chi    } : {}),
                                                ...(ability.toggle          !== undefined ? { toggle:          ability.toggle          } : {}),
                                ...(ability.resistances     !== undefined ? { resistances:     ability.resistances     } : {}),
                                ...(ability.immunities      !== undefined ? { immunities:      ability.immunities      } : {}),
                                ...(ability.vulnerabilities !== undefined ? { vulnerabilities: ability.vulnerabilities } : {}),
                                ...(ability.damage          !== undefined ? { damage:          ability.damage          } : {}),
                                ...(ability.damage_type     !== undefined ? { damage_type:     ability.damage_type     } : {}),
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
                                // Detect magic parry from fundamentals
                                for (const f of (rankData.fundamentals || [])) {
                                    if (/parada m[aá]gica/i.test(f)) {
                                        const m = f.match(/[Uu]sas ([^<]+?) para/);
                                        if (m) {
                                            const used = m[1].trim();
                                            const tagM = used.match(/[Mm]agia de (.+)/);
                                            rankEntry.parry_tag = tagM ? tagM[1] : used;
                                        } else {
                                            const titleM = rankData.title.match(/[Mm]agia de (.+)/);
                                            rankEntry.parry_tag = titleM ? titleM[1] : rankData.title;
                                        }
                                        break;
                                    }
                                }

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
            const getEmpowerCost = () => '1 chi · máx. 2×';
            const rankInMap = (skill) => skill && skill in this.ranks;
            return obArray.map(obj => {
                let formattedString = `<b>${obj.name}</b>`;
                let parenParts = [];
                if (obj.tags) parenParts.push(obj.tags);
                if (obj.cost) parenParts.push(obj.cost);
                if (parenParts.length > 0)
                    formattedString += ` (${parenParts.join('; ')})`;
                let descParts = [];
                if (obj.range) descParts.push(obj.range);
                if (obj.area) descParts.push(obj.area);
                if (obj.duration) descParts.push(obj.duration);
                let desc = rankInMap(obj.skill)
                    ? this.replaceTag(obj.description, obj.rank, obj.skill)
                    : this.resolveWeaponDesc(obj);
                desc = this.resolveStatTokens(desc);
                // Modifier prefix for attack spells or abilities that force saves
                if (rankInMap(obj.skill)) {
                    const tagsArr = (obj.tags || '').split(',').map(t => t.trim());
                    if (tagsArr.includes('Ataque') || (desc && desc.includes('debe superar'))) {
                        const mainStatKey = this.getMainStat(this.ranks[obj.skill].stat);
                        const mainStatVal = this.finalStats[mainStatKey].value;
                        if (mainStatVal !== '-') {
                            const mod = obj.rank + mainStatVal;
                            const advCount = this.abilityAdvantageCount(obj);
                            const advBit = advCount > 0 ? '+' + advCount + 'd6' : '';
                            const modStr = (mod >= 0 ? '+' + mod : String(mod)) + advBit;
                            desc = `<b>${modStr}</b> — ` + desc;
                        }
                    }
                }
                // Inline resistances/immunities granted by this ability
                const extras = [];
                if (obj.resistances && obj.resistances.length > 0) extras.push(`Resistencia a ${obj.resistances.join(', ')}`);
                if (obj.immunities && obj.immunities.length > 0) extras.push(`Inmunidad a ${obj.immunities.join(', ')}`);
                if (extras.length > 0) desc = (desc ? desc + '. ' : '') + extras.join('. ');
                // Integrate damage boosts
                if (obj.damage) {
                    const dmgBoosts = this.getDamageBoosts(obj);
                    const boostedDice = dmgBoosts.length > 0 ? this.applyDiceBoosts(obj.damage, dmgBoosts) : obj.damage;
                    const typeStr = obj.damage_type ? ` ${obj.damage_type}` : '';
                    const dmgLabel = `<b>${boostedDice}${typeStr} daño</b>`;
                    desc = desc ? dmgLabel + ' — ' + desc : dmgLabel;
                } else if (desc && /\d+d\d+(?:\s*[+\-]\s*\d+)?\s+daño/.test(desc)) {
                    const dmgBoosts = this.getDamageBoosts(obj);
                    if (dmgBoosts.length > 0) desc = this.applyDamageBoosts(desc, dmgBoosts);
                }
                if (desc) descParts.push(desc);
                if (descParts.length > 0)
                    formattedString += ': ' + descParts.join(', ');
                if (obj.crit) {
                    let crit = rankInMap(obj.skill)
                        ? this.resolveStatTokens(this.replaceTag(obj.crit, obj.rank, obj.skill))
                        : obj.crit;
                    formattedString += ` Crítico: ${crit}`;
                }
                if (obj.empower) {
                    let empower = rankInMap(obj.skill)
                        ? this.resolveStatTokens(this.replaceTag(obj.empower, obj.rank, obj.skill))
                        : obj.empower;
                    formattedString += ` <i>Empoderar (${getEmpowerCost()}): ${empower}</i>`;
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
        },
        isToggleActive(name) {
            return this.activeToggles.includes(name);
        },
        toggleAbility(name) {
            const idx = this.activeToggles.indexOf(name);
            if (idx >= 0) this.activeToggles.splice(idx, 1);
            else this.activeToggles.push(name);
        },
        toggleBenefitText(ab) {
            const t = ab.toggle;
            const parts = [];
            if (t.adv && t.adv.length > 0) parts.push('Vent: ' + t.adv.join(', '));
            if (t.adv_tags && t.adv_tags.length > 0) parts.push('+1d6 ' + t.adv_tags.join('/'));
            if (t.saves && t.saves.length > 0) parts.push('Salv: ' + t.saves.join(', '));
            if (t.damage) parts.push('Daño: ' + t.damage);
            if (t.def_set != null) parts.push('DEF→' + t.def_set);
            else if (t.def) parts.push('DEF+' + t.def);
            if (t.vt_temp) parts.push('+' + t.vt_temp + 'VT');
            if (t.stat_min != null) parts.push('Est≥' + t.stat_min);
            if (t.ce) parts.push('CE+' + (typeof t.ce === 'string' && t.ce.toLowerCase() === 'rango' ? 'Rango' : t.ce));
            if (t.resistances && t.resistances.length > 0) parts.push('Res: ' + t.resistances.join(', '));
            if (t.immunities && t.immunities.length > 0) parts.push('Inm: ' + t.immunities.join(', '));
            return parts.join(' · ');
        },
        applyDamageBoosts(desc, boosts) {
            if (!boosts.length || !desc) return desc;
            // Match the damage dice specifically: NdX (optional +/- modifier) daño
            // This skips any NdX that appears in the attack modifier prefix
            const dmgRegex = /(\d+)(d\d+)((?:\s*[+\-]\s*\d+)*)\s+daño/;
            const match = dmgRegex.exec(desc);
            if (!match) return desc;
            let count = parseInt(match[1]);
            const dieType = match[2];
            const literalExtra = [];
            for (const boost of boosts) {
                const b = boost.trim();
                if (/\+\d*\s*dado/i.test(b)) {
                    const n = parseInt((b.match(/\+(\d+)/) || ['', '1'])[1]);
                    count += n;
                } else {
                    const m = b.match(/\+?(\d+d\d+)/i);
                    if (m) literalExtra.push(m[1]);
                }
            }
            let newDice = count + dieType;
            if (literalExtra.length > 0) newDice += '+' + literalExtra.join('+');
            // Replace only the dice part (NdX), leaving the modifier and "daño" intact
            const diceStr = match[1] + match[2];
            return desc.substring(0, match.index) + newDice + desc.substring(match.index + diceStr.length);
        },
        applyDiceBoosts(diceStr, boosts) {
            if (!boosts.length || !diceStr) return diceStr;
            const match = /^(\d+)(d\d+)((?:\s*[+\-]\s*\d+)*)$/.exec(diceStr.trim());
            if (!match) return diceStr;
            let count = parseInt(match[1]);
            const dieType = match[2];
            const modifier = match[3];
            const literalExtra = [];
            for (const boost of boosts) {
                const b = boost.trim();
                if (/\+\d*\s*dado/i.test(b)) {
                    const n = parseInt((b.match(/\+(\d+)/) || ['', '1'])[1]);
                    count += n;
                } else {
                    const m = b.match(/\+?(\d+d\d+)/i);
                    if (m) literalExtra.push(m[1]);
                }
            }
            let result = count + dieType + modifier;
            if (literalExtra.length > 0) result += '+' + literalExtra.join('+');
            return result;
        },
        getDamageBoosts(obj) {
            const tags = (obj.tags || '').split(',').map(t => t.trim().toLowerCase());
            if (obj.damage_type) tags.push(obj.damage_type.toLowerCase());
            const hasRankSkill = !!(obj.skill && obj.skill in this.ranks);
            const hasDamageField = !!obj.damage;
            // If the ability has an explicit damage field, always check for boosts;
            // otherwise only apply to attack/improvement abilities and weapon abilities
            if (!hasDamageField && hasRankSkill && !tags.includes('ataque') && !tags.includes('mejora')) return [];
            const boosts = [];
            for (const ab of this.toggleableAbilities) {
                if (!this.isToggleActive(ab.toggle.label)) continue;
                const t = ab.toggle;
                if (!t.damage) continue;
                let applies = false;
                if (t.adv) {
                    for (const adv of t.adv) {
                        if (tags.includes(adv.toLowerCase())) { applies = true; break; }
                    }
                }
                if (!applies && t.adv_tags) {
                    for (const group of t.adv_tags) {
                        const required = group.split('+').map(s => s.trim().toLowerCase());
                        if (required.every(r => tags.includes(r))) { applies = true; break; }
                    }
                }
                if (!applies && hasRankSkill) {
                    const mainStatKey = this.getMainStat(this.ranks[obj.skill].stat);
                    if (t.adv) {
                        if      (t.adv.includes('Físico')   && ['str', 'dex', 'con'].includes(mainStatKey)) applies = true;
                        else if (t.adv.includes('Voluntad') && ['con', 'cha'].includes(mainStatKey))        applies = true;
                        else if (t.adv.includes('Mental')   && ['itl', 'wis'].includes(mainStatKey))        applies = true;
                    }
                }
                if (applies) boosts.push(t.damage);
            }
            return boosts;
        },
        resolveStatTokens(str) {
            if (!str) return str;
            const fs = this.finalStats;
            const statMap = {
                'FUE': fs.str.value, 'DES': fs.dex.value, 'CON': fs.con.value,
                'INT': fs.itl.value, 'SAB': fs.wis.value, 'CAR': fs.cha.value
            };
            // Replace STAT1/STAT2 alternatives (pick max)
            str = str.replace(/\b(FUE|DES|CON|INT|SAB|CAR)\/(FUE|DES|CON|INT|SAB|CAR)\b/g, (_, a, b) => {
                const va = statMap[a], vb = statMap[b];
                if (va === '-' && vb === '-') return '-';
                if (va === '-') return String(vb);
                if (vb === '-') return String(va);
                return String(Math.max(va, vb));
            });
            // Replace individual stat tokens
            return str.replace(/\b(FUE|DES|CON|INT|SAB|CAR)\b/g, (_, token) => {
                const v = statMap[token];
                return v === '-' ? '-' : String(v);
            });
        },
        abilityAdvantageCount(obj) {
            const tags = (obj.tags || '').split(',').map(t => t.trim().toLowerCase());
            let count = 0;
            for (const ab of this.toggleableAbilities) {
                if (!this.isToggleActive(ab.toggle.label)) continue;
                const t = ab.toggle;
                let grants = false;
                if (t.adv) {
                    for (const adv of t.adv) {
                        if (tags.includes(adv.toLowerCase())) { grants = true; break; }
                    }
                }
                if (!grants && t.adv_tags) {
                    for (const group of t.adv_tags) {
                        const required = group.split('+').map(s => s.trim().toLowerCase());
                        if (required.every(r => tags.includes(r))) { grants = true; break; }
                    }
                }
                if (!grants && obj.skill && obj.skill in this.ranks) {
                    const mk = this.getMainStat(this.ranks[obj.skill].stat);
                    const has = (types) => types.some(s =>
                        (t.adv && t.adv.includes(s)) || (t.saves && t.saves.includes(s)));
                    if      (['str','dex','con'].includes(mk) && has(['Físico']))            grants = true;
                    else if (['con','cha'].includes(mk)       && has(['Voluntad','Físico'])) grants = true;
                    else if (['itl','wis'].includes(mk)       && has(['Mental']))            grants = true;
                }
                if (grants) count++;
            }
            return Math.min(count, 4);
        },
        resolveWeaponDesc(obj) {
            const desc = obj.description || '';
            if (!desc.includes('MOD') && !desc.includes('STAT')) return desc;
            const tags = (obj.tags || '').toLowerCase();
            const strV = this.finalStats.str.value === '-' ? 0 : this.finalStats.str.value;
            const dexV = this.finalStats.dex.value === '-' ? 0 : this.finalStats.dex.value;
            const colosoRk   = this.getRank('estilo_coloso');
            const duelistaRk = this.getRank('estilo_duelista');
            const asesinоRk  = this.getRank('estilo_asesino');
            let stat, mod;
            if (tags.includes('pesada') || tags.includes('pesado')) {
                stat = strV; mod = strV + colosoRk;
            } else if (tags.includes('duelo')) {
                stat = Math.max(strV, dexV); mod = Math.max(strV, dexV) + duelistaRk;
            } else if (tags.includes('ligera') || tags.includes('a distancia')) {
                stat = dexV; mod = dexV + asesinоRk;
            } else {
                stat = Math.max(strV, dexV); mod = Math.max(strV, dexV);
            }
            const advCount = this.abilityAdvantageCount(obj);
            const advStr = advCount > 0 ? '+' + advCount + 'd6' : '';
            const modStr = (mod >= 0 ? '+' + mod : String(mod)) + advStr;
            return desc
                .replace(/\+MOD\b/g, modStr)
                .replace(/\bSTAT\b/g, String(stat));
        },
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
            for (const rs of this.toggleBuffs.resistances) {
                if (!rsobj.immunities.includes(rs) && !rsobj.supresist.includes(rs) && !rsobj.resistances.includes(rs))
                    rsobj.resistances.push(rs);
            }
            for (const rs of this.toggleBuffs.immunities) {
                if (!rsobj.immunities.includes(rs)) {
                    const rIdx = rsobj.resistances.indexOf(rs);
                    if (rIdx >= 0) rsobj.resistances.splice(rIdx, 1);
                    const sIdx = rsobj.supresist.indexOf(rs);
                    if (sIdx >= 0) rsobj.supresist.splice(sIdx, 1);
                    rsobj.immunities.push(rs);
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
            const countSave = (saveType) => {
                let n = 0;
                for (const ab of this.toggleableAbilities) {
                    if (!this.isToggleActive(ab.toggle.label)) continue;
                    const t = ab.toggle;
                    let grants = (t.adv && t.adv.includes(saveType)) || (t.saves && t.saves.includes(saveType));
                    if (!grants && saveType === 'Voluntad')
                        grants = (t.adv && t.adv.includes('Físico')) || (t.saves && t.saves.includes('Físico'));
                    if (!grants && (saveType === 'Voluntad' || saveType === 'Mental'))
                        grants = !!(t.resistances && t.resistances.some(r => ['Miedo', 'Mental'].includes(r)));
                    if (grants) n++;
                }
                return Math.min(n, 4);
            };
            const advStr = (base, count) => (count > 0 && base !== '-') ? base + '+' + count + 'd6' : base;
            return {
                fisico:   advStr(fmt(sum(fs.str.value, fs.dex.value)), countSave('Físico')),
                voluntad: advStr(fmt(sum(fs.con.value, fs.cha.value)), countSave('Voluntad')),
                mental:   advStr(fmt(sum(fs.itl.value, fs.wis.value)), countSave('Mental')),
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
            const tb = this.toggleBuffs;
            if (tb.stat_min !== null) {
                for (const stat of tb.stat_min_list) {
                    if (stat in statsRes && statsRes[stat].value !== '-' && statsRes[stat].value < tb.stat_min)
                        statsRes[stat].value = tb.stat_min;
                }
            }
            return statsRes;
        },
        def: function () {
            let res = 0;
            if (this.equipment.armor.def != null)
                res += this.equipment.armor.def;
            res += this.sumAllKeys('def', this.myatb.passive);
            res += this.toggleBuffs.def;
            if (this.toggleBuffs.def_set !== null && res < this.toggleBuffs.def_set)
                res = this.toggleBuffs.def_set;
            return res;
        },
        actions: function () {
            return 3 + this.sumAllKeys('actions', this.myatb.passive);
        },
        arclevels: function () {
            return this.sumAllKeys('rank', this.myarch);
        },
        defenseReactions: function () {
            const fs = this.finalStats;
            const dexV = fs.dex.value === '-' ? 0 : fs.dex.value;
            const reflejosRank = this.getRank('reflejos');
            const fmtMod = (num, adv) => {
                const base = num >= 0 ? '+' + num : String(num);
                return adv > 0 ? base + '+' + adv + 'd6' : base;
            };
            const lines = [];

            // Esquiva — always present
            const esquivaMod = dexV + reflejosRank;
            const esquivaAdv = this.abilityAdvantageCount({ tags: 'Reflejos, Defensiva' });
            lines.push(`<b>Esquiva</b> (Reflejos, Defensiva): ${fmtMod(esquivaMod, esquivaAdv)} para defenderse`);

            // Parada Mágica — one per magic rank with a parry_tag
            const seenParry = new Set();
            for (const key in this.myranks) {
                const rk = this.myranks[key];
                if (rk.rank <= 0) continue;
                const rd = this.ranks[rk.id];
                if (!rd || !rd.parry_tag || seenParry.has(rd.parry_tag)) continue;
                seenParry.add(rd.parry_tag);
                const mainStatKey = this.getMainStat(rd.stat);
                const statVal = fs[mainStatKey] ? fs[mainStatKey].value : '-';
                const mod = statVal === '-' ? null : statVal + rk.rank;
                const parryAdv = this.abilityAdvantageCount({ tags: rd.parry_tag + ', Defensiva' });
                const modStr = mod === null ? '-' : fmtMod(mod, parryAdv);
                lines.push(`<b>Parada Mágica</b> (${rd.parry_tag}, Defensiva): ${modStr} para defenderse`);
            }

            // Parada — one per weapon style equipped (deduped)
            const styleTagMap = { heavy: 'Pesadas', duelist: 'Duelo', light: 'Ligeras', ranged: 'A Distancia', flex: 'Flexible' };
            const seenWeap = new Set();
            for (const weapon of [this.equipment.mainHand, this.equipment.secondHand]) {
                if (!weapon || !weapon.name || !weapon.style || weapon.style === 'shield') continue;
                const tag = styleTagMap[weapon.style] || weapon.style;
                if (seenWeap.has(tag)) continue;
                seenWeap.add(tag);
                const mod = this.weaponMod(weapon);
                if (!mod) continue;
                const parryAdv = this.abilityAdvantageCount({ tags: tag + ', Defensiva' });
                const modStr = parryAdv > 0 ? mod + '+' + parryAdv + 'd6' : mod;
                lines.push(`<b>Parada</b> (${tag}, Defensiva): ${modStr} para defenderse`);
            }

            return lines.join('<br><br>');
        },
        weaponString: function () {
            const atkAdv = this.toggleBuffs.adv.includes('Ataque');
            const slots = [
                { label: 'MP', weapon: this.equipment.mainHand },
                { label: 'MS', weapon: this.equipment.secondHand }
            ];
            const styleLabel = { heavy: 'Coloso', duelist: 'Duelista', light: 'Asesino', ranged: 'Asesino', flex: 'flex', shield: null };
            return slots
                .filter(s => s.weapon && s.weapon.name)
                .map(s => {
                    const mod = this.weaponMod(s.weapon);
                    const modStr = mod ? (atkAdv ? mod + '+1d6' : mod) : null;
                    const style = s.weapon.style ? styleLabel[s.weapon.style] : null;
                    const suffix = [modStr, style ? `(${style})` : null].filter(Boolean).join(' ');
                    return suffix ? `${s.weapon.name} ${suffix}` : s.weapon.name;
                })
                .join(', ');
        },
        toggleableAbilities: function () {
            const all = [...this.myatb.passive, ...this.myatb.actions, ...this.myatb.reactions];
            const seen = new Set();
            return all.filter(a => {
                if (!a.toggle) return false;
                const key = a.toggle.label;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        },
        toggleBuffs: function () {
            const buffs = {
                adv: [], adv_tags: [], saves: [],
                def: 0, def_set: null, vt_temp: 0,
                stat_min: null, stat_min_list: [], ce: 0,
                resistances: [], immunities: [], damage: []
            };
            for (const ab of this.toggleableAbilities) {
                if (!this.isToggleActive(ab.toggle.label)) continue;
                const t = ab.toggle;
                if (t.adv) t.adv.forEach(a => { if (!buffs.adv.includes(a)) buffs.adv.push(a); });
                if (t.adv_tags) t.adv_tags.forEach(a => { if (!buffs.adv_tags.includes(a)) buffs.adv_tags.push(a); });
                if (t.saves) t.saves.forEach(s => { if (!buffs.saves.includes(s)) buffs.saves.push(s); });
                if (t.def) buffs.def += t.def;
                if (t.def_set != null && (buffs.def_set === null || t.def_set > buffs.def_set)) buffs.def_set = t.def_set;
                if (t.vt_temp) buffs.vt_temp += t.vt_temp;
                if (t.stat_min != null && (buffs.stat_min === null || t.stat_min > buffs.stat_min)) buffs.stat_min = t.stat_min;
                if (t.stat_min_list) t.stat_min_list.forEach(s => { if (!buffs.stat_min_list.includes(s)) buffs.stat_min_list.push(s); });
                if (t.ce) {
                    if (typeof t.ce === 'number') buffs.ce += t.ce;
                    else if (t.ce.toLowerCase() === 'rango') buffs.ce += (ab.rank || 0);
                }
                if (t.resistances) t.resistances.forEach(r => { if (!buffs.resistances.includes(r)) buffs.resistances.push(r); });
                if (t.immunities) t.immunities.forEach(r => { if (!buffs.immunities.includes(r)) buffs.immunities.push(r); });
                if (t.damage) buffs.damage.push(t.damage);
            }
            return buffs;
        },
        shieldCounters: function () {
            return this.sumAllKeys('ce', this.myatb.passive) + this.toggleBuffs.ce;
        },
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
