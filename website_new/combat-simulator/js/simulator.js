// ==========================================
//  RALDAMAIN COMBAT SIMULATOR v1.0
// ==========================================

// ===== DICE UTILITIES =====

const Dice = {
    roll(sides) {
        return Math.floor(Math.random() * sides) + 1;
    },
    d20() { return this.roll(20); },
    d6()  { return this.roll(6); },

    rollMultiple(count, sides) {
        const rolls = [];
        for (let i = 0; i < count; i++) rolls.push(this.roll(sides));
        return rolls;
    },

    parseDice(str) {
        const m = str.match(/(\d+)d(\d+)/);
        return m ? { count: parseInt(m[1]), sides: parseInt(m[2]) } : null;
    },

    rollParsed(diceStr, multiplier = 1) {
        const p = this.parseDice(diceStr);
        if (!p) return { total: 0, rolls: [], str: '0' };
        const count = p.count * multiplier;
        const rolls = this.rollMultiple(count, p.sides);
        const total = rolls.reduce((a, b) => a + b, 0);
        return { total, rolls, str: `${count}d${p.sides}(${rolls.join(',')})` };
    }
};

// ===== CONSTANTS =====

const STAT_MAP = {
    'Fuerza': 'str', 'FUE': 'str', 'Destreza': 'dex', 'DES': 'dex',
    'Constitución': 'con', 'CON': 'con', 'Inteligencia': 'int', 'INT': 'int',
    'Sabiduría': 'wis', 'SAB': 'wis', 'Carisma': 'cha', 'CAR': 'cha'
};
const STAT_DISPLAY = { str: 'FUE', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' };

// ===== PARSERS =====

function parseCost(costStr) {
    if (!costStr) return { actions: 0, chi: 0 };
    let actions = 0, chi = 0;
    const am = costStr.match(/(\d+)\s*acci[oó]n/i);
    if (am) actions = parseInt(am[1]);
    const cm = costStr.match(/(\d+)\s*chi/i);
    if (cm) chi = parseInt(cm[1]);
    return { actions: actions || 0, chi };
}

function extractDamage(desc) {
    if (!desc) return null;
    const patterns = [
        /(\d+d\d+)\s*\+\s*(FUE|DES|CON|INT|SAB|CAR)\s+da[nñ]o\s+(?:de\s+)?(\w+)/i,
        /(\d+d\d+)\s*\+\s*(FUE|DES|CON|INT|SAB|CAR)/i,
        /(\d+d\d+)\s*\+\s*Rango/i,
        /[Ii]nflige\s+(\d+d\d+)/,
        /(\d+d\d+)\s+(?:de\s+)?da[nñ]o/i,
    ];
    for (const pat of patterns) {
        const m = desc.match(pat);
        if (m) {
            const dice = m[1];
            const stat = m[2] ? (STAT_MAP[m[2]] || null) : null;
            const type = m[3] || 'Magico';
            // Try to find damage type elsewhere
            let dmgType = type;
            const typeMatch = desc.match(/da[nñ]o\s+(?:de\s+)?(?:tipo\s+)?(Fuego|Fr[ií]o|El[eé]ctrico|S[oó]nico|Radiante|Necr[oó]tico|Arcano|Cortante|Contundente|Perforante|Profano|Fuerza|Divino)/i);
            if (typeMatch) dmgType = typeMatch[1];
            return { dice, stat, type: dmgType };
        }
    }
    return null;
}

function parseAbilitiesFromRank(rankData, charRankLevel) {
    const abilities = [];
    if (!rankData || !rankData.levels) return abilities;
    const roman = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6 };

    for (const level of rankData.levels) {
        const lvNum = roman[level.rank] || 0;
        if (lvNum > charRankLevel) break;
        if (!level.abilities) continue;

        for (const ab of level.abilities) {
            const tags = ab.tags || [];
            const cost = parseCost(ab.cost);
            const damage = extractDamage(ab.desc || '');
            const isPassive = tags.some(t => t.toLowerCase() === 'pasiva');
            const isReaction = tags.some(t => t.toLowerCase() === 'reacción' || t.toLowerCase() === 'reaccion');

            // Only include abilities that are usable in combat
            if (cost.actions === 0 && cost.chi === 0 && !isPassive && !isReaction && !damage) continue;

            abilities.push({
                name: ab.name,
                tags,
                cost,
                costStr: ab.cost || '',
                desc: ab.desc || '',
                damage,
                isPassive,
                isReaction,
                rankId: rankData.id,
                rankTitle: rankData.title,
                rankLevel: charRankLevel,
                range: ab.range || 'Cuerpo a cuerpo'
            });
        }
    }
    return abilities;
}

// ===== COMBATANT STATE =====

class Combatant {
    constructor(charData, abilities) {
        this.name = charData.name;
        this.level = charData.level;
        this.stats = { ...charData.stats };
        this.ranks = charData.ranks;

        // Weapon (fallback to unarmed)
        this.weapon = charData.weapon || {
            name: 'Desarmado', damage: '1d4', stat: 'str',
            damageType: 'Contundente', range: 'melee'
        };
        if (!this.weapon.rankId && this.ranks.length > 0) {
            this.weapon.rankId = this.ranks[0].id;
        }

        // Armor
        this.armorDef = charData.armor ? charData.armor.def || 0 : 0;
        this.armorName = charData.armor ? charData.armor.name || 'Sin armadura' : 'Sin armadura';

        // Abilities
        this.abilities = abilities;

        // Derived stats
        this.maxVitality = 2 + (this.stats.con || 0) + this.level;
        this.vitality = this.maxVitality;
        this.maxHP = 3 + (this.stats.con || 0) + Math.floor((this.level - 1) / 3);
        this.hp = this.maxHP;
        this.maxCordura = 2 + this.level + (this.stats.int || 0);
        this.cordura = this.maxCordura;
        this.def = this.armorDef;

        // Chi pool
        this.maxChi = 0;
        for (const r of this.ranks) this.maxChi += r.rank * 2;
        this.chi = this.maxChi;

        // Per-round resources
        this.baseActions = 3;
        this.baseReactions = 2;
        this.actionsLeft = this.baseActions;
        this.reactionsLeft = this.baseReactions;

        // Shields, wounds
        this.shields = 0;
        this.maxShields = Math.ceil(this.level / 2);
        this.wounds = 0; // 0=none 1=leve 2=media 3=grave
        this.conscious = true;
        this.alive = true;

        // Advantage trackers
        this.advAttack = 0;
        this.advDefense = 0;
        this.bonusDef = 0;
        this.damageReduction = 0;
        this.resistances = [];

        // Initiative
        this.initiative = 0;

        this._applyPassives();
    }

    _applyPassives() {
        for (const ab of this.abilities) {
            if (!ab.isPassive) continue;
            const d = ab.desc.toLowerCase();

            // Extra action per turn
            if (d.includes('+1 acci') && d.includes('por turno')) {
                this.baseActions++;
            }
            // Advantage on physical rolls (Forma de la Bestia etc.)
            if (d.includes('ventaja') && (d.includes('físic') || d.includes('ataque'))) {
                this.advAttack++;
            }
            // DEF bonuses
            const defM = d.match(/def.*?aumenta.*?rango\s*\+\s*(\d+)/i) || d.match(/def.*?(\d+)/i);
            if (defM && d.includes('def')) {
                // Only apply flat bonuses, skip formula-based
                const val = parseInt(defM[1]);
                if (val <= 6) this.bonusDef += val;
            }
            // Damage reduction
            if (d.includes('reduces') && d.includes('da') && d.includes('recibido')) {
                const drM = d.match(/(\d+)/);
                if (drM) this.damageReduction += parseInt(drM[1]);
            }
            // Resistances
            const resTypes = ['Fuego', 'Frío', 'Eléctrico', 'Sónico', 'Radiante', 'Necrótico', 'Arcano', 'Mental', 'Contundente', 'Cortante', 'Perforante'];
            for (const t of resTypes) {
                if (d.includes('resistencia') && d.includes(t.toLowerCase())) {
                    if (!this.resistances.includes(t)) this.resistances.push(t);
                }
            }
            // Shield counters (from Fortitud or similar)
            const shM = d.match(/(\d+)\s*contadores?\s*de\s*escudo/i) ||
                         d.match(/contadores?\s*de\s*escudo.*?(\d+)/i);
            if (shM) {
                this.shields = Math.min(parseInt(shM[1]), this.maxShields);
            }
            if (d.includes('contadores de escudo') && d.includes('rango')) {
                const bestRank = this.ranks.reduce((mx, r) => Math.max(mx, r.rank), 0);
                this.shields = Math.min(bestRank, this.maxShields);
            }
        }
        this.def += this.bonusDef;
        this.actionsLeft = this.baseActions;
    }

    getAttackBonus() {
        const stat = this.stats[this.weapon.stat] || 0;
        const rk = this.ranks.find(r => r.id === this.weapon.rankId);
        const rkLvl = rk ? rk.rank : (this.ranks[0] ? this.ranks[0].rank : 0);
        return stat + rkLvl;
    }

    getParryBonus() {
        const stat = Math.max(this.stats.str || 0, this.stats.dex || 0);
        const bestMelee = this.ranks.reduce((mx, r) => Math.max(mx, r.rank), 0);
        return stat + bestMelee;
    }

    getDodgeBonus() {
        const dex = this.stats.dex || 0;
        const reflejos = this.ranks.find(r => r.id === 'reflejos');
        const rkLvl = reflejos ? reflejos.rank : this.ranks.reduce((mx, r) => Math.max(mx, r.rank), 0);
        return dex + rkLvl;
    }

    getInitBonus() {
        let bonus = this.stats.dex || 0;
        const reflejos = this.ranks.find(r => r.id === 'reflejos');
        if (reflejos) bonus += reflejos.rank;
        return bonus;
    }

    getUsableOffensiveAbilities() {
        return this.abilities.filter(ab => {
            if (ab.isPassive || ab.isReaction) return false;
            if (!ab.damage) return false;
            if (ab.cost.chi > this.chi) return false;
            const actionCost = ab.cost.actions || 1;
            if (actionCost > this.actionsLeft) return false;
            return true;
        });
    }

    takeDamage(amount, type, log) {
        // Resistance
        if (this.resistances.includes(type)) {
            const orig = amount;
            amount = Math.floor(amount / 2);
            log(`  > Resistencia a ${type}: ${orig} -> ${amount}`);
        }
        // Damage reduction
        if (this.damageReduction > 0 && amount > 0) {
            const red = Math.min(amount, this.damageReduction);
            amount -= red;
            log(`  > Reduccion de dano: -${red}`);
        }
        if (amount <= 0) {
            log(`  > Dano completamente absorbido.`);
            return;
        }

        // Vitality first, then HP
        if (this.vitality > 0) {
            const vDmg = Math.min(amount, this.vitality);
            this.vitality -= vDmg;
            const rem = amount - vDmg;
            if (rem > 0) {
                this.hp -= rem;
                this.wounds = Math.min(this.wounds + 1, 3);
                const wName = ['', 'Leve', 'Media', 'Grave'][this.wounds];
                log(`  > ${this.name}: -${vDmg} Vitalidad, -${rem} PV | Herida ${wName}`);
            } else {
                log(`  > ${this.name}: -${vDmg} Vitalidad [${this.vitality}/${this.maxVitality}]`);
            }
        } else {
            this.hp -= amount;
            this.wounds = Math.min(this.wounds + 1, 3);
            const wName = ['', 'Leve', 'Media', 'Grave'][this.wounds];
            log(`  > ${this.name}: -${amount} PV | Herida ${wName}`);
        }

        // Check unconscious / death
        if (this.hp <= 0) {
            this.conscious = false;
            log(`  >> ${this.name} cae INCONSCIENTE (PV: ${this.hp})`);
            if (this.hp <= -(this.stats.con || 0)) {
                this.alive = false;
                log(`  >>> ${this.name} HA MUERTO <<<`);
            }
        }
    }

    statusLine() {
        return `[${this.name}] VIT ${this.vitality}/${this.maxVitality} | PV ${this.hp}/${this.maxHP} | Chi ${this.chi}/${this.maxChi} | DEF ${this.def}` +
               (this.shields > 0 ? ` | Escudos ${this.shields}` : '');
    }

    isOut() {
        return !this.alive || !this.conscious;
    }
}

// ===== COMBAT ENGINE =====

class CombatEngine {
    constructor(fighter1, fighter2) {
        this.f = [fighter1, fighter2];
        this.lines = [];
        this.round = 0;
        this.maxRounds = 30;
    }

    log(msg) { this.lines.push(msg); }

    run() {
        this.log('========================================');
        this.log('   SIMULADOR DE COMBATE  -  RALDAMAIN   ');
        this.log('========================================');
        this.log('');

        // Show combatants
        for (const f of this.f) {
            this.log(`> ${f.name} (Nivel ${f.level})`);
            this.log(`  FUE ${f.stats.str} | DES ${f.stats.dex} | CON ${f.stats.con} | INT ${f.stats.int} | SAB ${f.stats.wis} | CAR ${f.stats.cha}`);
            this.log(`  Vitalidad: ${f.maxVitality} | PV: ${f.maxHP} | Chi: ${f.maxChi} | DEF: ${f.def}`);
            this.log(`  Arma: ${f.weapon.name} (${f.weapon.damage} ${f.weapon.damageType})`);
            this.log(`  Armadura: ${f.armorName} (DEF ${f.armorDef})`);
            this.log(`  Rangos: ${f.ranks.map(r => (r.title || r.id) + ' ' + r.rank).join(', ')}`);
            if (f.resistances.length) this.log(`  Resistencias: ${f.resistances.join(', ')}`);
            if (f.shields > 0) this.log(`  Escudos: ${f.shields}`);
            this.log('');
        }

        // Initiative
        this.log('--- INICIATIVA ---');
        for (const f of this.f) {
            const roll = Dice.d20();
            const bonus = f.getInitBonus();
            f.initiative = roll + bonus;
            this.log(`${f.name}: 1d20(${roll}) + ${bonus} = ${f.initiative}`);
        }
        this.f.sort((a, b) => b.initiative - a.initiative);
        this.log(`Orden: ${this.f[0].name} (${this.f[0].initiative}) -> ${this.f[1].name} (${this.f[1].initiative})`);
        this.log('');

        // Combat loop
        while (!this.f[0].isOut() && !this.f[1].isOut() && this.round < this.maxRounds) {
            this.round++;
            this.log(`=============== RONDA ${this.round} ===============`);

            for (let i = 0; i < 2; i++) {
                const atk = this.f[i];
                const def = this.f[1 - i];
                if (atk.isOut() || def.isOut()) break;
                this.executeTurn(atk, def);
            }
        }

        // Result
        this.log('');
        this.log('========================================');
        if (this.f[0].isOut() && !this.f[1].isOut()) {
            this.log(`  GANADOR: ${this.f[1].name}`);
        } else if (this.f[1].isOut() && !this.f[0].isOut()) {
            this.log(`  GANADOR: ${this.f[0].name}`);
        } else if (this.f[0].isOut() && this.f[1].isOut()) {
            this.log('  DOBLE KO');
        } else {
            this.log('  EMPATE - Limite de rondas alcanzado');
        }
        this.log('========================================');
        this.log('');
        this.log('--- Estado final ---');
        for (const f of this.f) this.log(f.statusLine());

        return this.lines;
    }

    executeTurn(atk, def) {
        // Reset attacker's resources
        atk.actionsLeft = atk.baseActions;
        atk.reactionsLeft = atk.baseReactions;

        this.log('');
        this.log(`--- Turno de ${atk.name} ---`);
        this.log(atk.statusLine());
        this.log(def.statusLine());

        let actionNum = 0;

        while (atk.actionsLeft > 0 && !def.isOut()) {
            actionNum++;

            // AI: choose ability or basic attack
            const ability = this.pickAbility(atk);

            if (ability) {
                this.executeAbility(atk, def, ability, actionNum);
            } else {
                this.executeWeaponAttack(atk, def, actionNum, false);
            }
        }
    }

    pickAbility(atk) {
        const usable = atk.getUsableOffensiveAbilities();
        if (usable.length === 0) return null;
        // Use abilities ~40% of the time to mix with basic attacks
        if (Math.random() < 0.55) return null;
        // Pick highest damage ability
        usable.sort((a, b) => {
            const ad = a.damage ? Dice.parseDice(a.damage.dice) : null;
            const bd = b.damage ? Dice.parseDice(b.damage.dice) : null;
            return (bd ? bd.count * bd.sides : 0) - (ad ? ad.count * ad.sides : 0);
        });
        return usable[0];
    }

    executeWeaponAttack(atk, def, actionNum, isOpening) {
        if (!isOpening) atk.actionsLeft--;

        const weapon = atk.weapon;
        const prefix = isOpening ? '  [APERTURA]' : `  [Accion ${actionNum}]`;

        // Attack roll
        const atkRoll = Dice.d20();
        const isCrit = atkRoll === 20;
        const atkBonus = atk.getAttackBonus();
        let atkTotal = atkRoll + atkBonus;

        // Advantage on attack
        let advStr = '';
        if (atk.advAttack > 0) {
            const adv = Dice.d6();
            atkTotal += adv;
            advStr = ` + Ventaja(${adv})`;
        }

        this.log(`${prefix} ${atk.name} ataca con ${weapon.name}`);
        this.log(`    Ataque: 1d20(${atkRoll}) + ${atkBonus}${advStr} = ${atkTotal}${isCrit ? ' *** CRITICO ***' : ''}`);

        // Defense
        const defended = this.resolveDefense(def, atkTotal, isCrit, atk, isOpening);

        if (!defended) {
            this.resolveDamage(atk, def, weapon.damage, atk.stats[weapon.stat] || 0, weapon.damageType, isCrit);
        }
    }

    executeAbility(atk, def, ability, actionNum) {
        const aCost = ability.cost.actions || 1;
        atk.actionsLeft -= aCost;
        atk.chi -= ability.cost.chi;

        this.log(`  [Accion ${actionNum}] ${atk.name} usa ${ability.name} (${ability.costStr}) [Chi: ${atk.chi}/${atk.maxChi}]`);

        if (!ability.damage) {
            this.log('    Efecto narrativo aplicado.');
            return;
        }

        // Attack roll
        const atkRoll = Dice.d20();
        const isCrit = atkRoll === 20;
        const rk = atk.ranks.find(r => r.id === ability.rankId);
        const rkLvl = rk ? rk.rank : 1;
        const statKey = ability.damage.stat || atk.weapon.stat || 'int';
        const statMod = atk.stats[statKey] || 0;
        const atkBonus = statMod + rkLvl;
        let atkTotal = atkRoll + atkBonus;

        let advStr = '';
        if (atk.advAttack > 0) {
            const adv = Dice.d6();
            atkTotal += adv;
            advStr = ` + Ventaja(${adv})`;
        }

        this.log(`    Ataque: 1d20(${atkRoll}) + ${atkBonus}${advStr} = ${atkTotal}${isCrit ? ' *** CRITICO ***' : ''}`);

        const isMelee = !ability.range || ability.range.toLowerCase().includes('cuerpo') || ability.range.toLowerCase().includes('toque');
        const defended = this.resolveDefense(def, atkTotal, isCrit, atk, false, isMelee);

        if (!defended) {
            this.resolveDamage(atk, def, ability.damage.dice, statMod, ability.damage.type, isCrit);
        }
    }

    resolveDefense(def, atkTotal, isCrit, atk, isOpening, isMelee = true) {
        if (isCrit) {
            this.log(`    Critico - no se puede defender.`);
            return false;
        }

        if (def.reactionsLeft <= 0) {
            this.log(`    ${def.name} no tiene reacciones disponibles.`);
            return false;
        }

        // Choose parry or dodge (whichever is better)
        const parryB = def.getParryBonus();
        const dodgeB = def.getDodgeBonus();
        const useParry = parryB >= dodgeB;
        const defType = useParry ? 'Parada' : 'Esquiva';
        const defBonus = useParry ? parryB : dodgeB;

        def.reactionsLeft--;

        const defRoll = Dice.d20();
        let defTotal = defRoll + defBonus;

        let advStr = '';
        if (def.advDefense > 0) {
            const adv = Dice.d6();
            defTotal += adv;
            advStr = ` + Ventaja(${adv})`;
        }

        this.log(`    ${def.name} usa ${defType}: 1d20(${defRoll}) + ${defBonus}${advStr} = ${defTotal}`);

        if (defTotal >= atkTotal) {
            this.log(`    ${defType} EXITOSA - ataque bloqueado.`);

            // Opening: only on failed melee attacks, not from openings
            if (!isOpening && isMelee && def.reactionsLeft > 0) {
                // AI: take opening only if 2+ reactions remain (save at least 1 for defense)
                const takeOpening = def.reactionsLeft >= 2 || (def.reactionsLeft >= 1 && Math.random() < 0.3);
                if (takeOpening) {
                    this.log(`    >> ${def.name} explota la APERTURA (1 reaccion)`);
                    def.reactionsLeft--;
                    this.executeWeaponAttack(def, atk, 0, true);
                }
            }
            return true;
        } else {
            this.log(`    ${defType} FALLIDA.`);
            return false;
        }
    }

    resolveDamage(atk, def, diceStr, statMod, dmgType, isCrit) {
        const mult = isCrit ? 2 : 1;
        const diceResult = Dice.rollParsed(diceStr, mult);
        const rawDmg = diceResult.total + statMod;

        // Apply DEF
        let afterDef = Math.max(0, rawDmg - def.def);

        // Apply shields
        let shieldsUsed = 0;
        while (afterDef >= 5 && def.shields > 0) {
            def.shields--;
            afterDef = Math.max(0, afterDef - 10);
            shieldsUsed++;
        }

        const shieldStr = shieldsUsed > 0 ? ` - ${shieldsUsed} escudo(s)` : '';
        this.log(`    IMPACTO: ${diceResult.str} + ${statMod} = ${rawDmg} - DEF ${def.def}${shieldStr} = ${afterDef} dano ${dmgType}`);

        if (afterDef > 0) {
            def.takeDamage(afterDef, dmgType, (msg) => this.log(msg));
        } else {
            this.log(`    Dano absorbido por la armadura.`);
        }
    }
}

// ===== SIMULATOR APP =====

class SimulatorApp {
    constructor() {
        this.char1 = null;
        this.char2 = null;
        this.running = false;

        document.getElementById('file1').addEventListener('change', (e) => this.loadFile(e, 1));
        document.getElementById('file2').addEventListener('change', (e) => this.loadFile(e, 2));
        document.getElementById('btn-simulate').addEventListener('click', () => this.simulate());
        document.getElementById('btn-clear').addEventListener('click', () => this.clearLog());
    }

    loadFile(event, num) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.validateChar(data);
                if (num === 1) { this.char1 = data; this.showSummary(data, 'summary1'); }
                else { this.char2 = data; this.showSummary(data, 'summary2'); }
            } catch (err) {
                alert('Error al leer el JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    validateChar(data) {
        if (!data.name) throw new Error('Falta el campo "name"');
        if (!data.level) throw new Error('Falta el campo "level"');
        if (!data.stats) throw new Error('Falta el campo "stats"');
        if (!data.ranks || !data.ranks.length) throw new Error('Falta el campo "ranks"');
    }

    showSummary(data, elId) {
        const el = document.getElementById(elId);
        const s = data.stats;
        const vit = 2 + (s.con || 0) + data.level;
        const hp = 3 + (s.con || 0) + Math.floor((data.level - 1) / 3);
        let chi = 0;
        for (const r of data.ranks) chi += r.rank * 2;

        el.innerHTML = `
            <div class="char-name">${data.name}</div>
            <div>Nivel ${data.level} | VIT ${vit} | PV ${hp} | Chi ${chi}</div>
            <div class="stat-line">FUE ${s.str||0} DES ${s.dex||0} CON ${s.con||0} INT ${s.int||0} SAB ${s.wis||0} CAR ${s.cha||0}</div>
            <div>Arma: ${data.weapon ? data.weapon.name : 'Desarmado'} | DEF: ${data.armor ? data.armor.def : 0}</div>
            <div>Rangos: ${data.ranks.map(r => r.id + ' ' + r.rank).join(', ')}</div>
        `;
    }

    async simulate() {
        if (!this.char1 || !this.char2) {
            alert('Carga dos personajes antes de simular.');
            return;
        }
        if (this.running) return;
        this.running = true;

        const logEl = document.getElementById('combat-log');
        const btn = document.getElementById('btn-simulate');
        btn.disabled = true;
        btn.textContent = 'SIMULANDO...';
        logEl.textContent = 'Cargando datos de rangos...\n';

        try {
            // Collect all rank IDs
            const allIds = new Set();
            for (const r of this.char1.ranks) allIds.add(r.id);
            for (const r of this.char2.ranks) allIds.add(r.id);

            // Fetch rank data
            const rankDataMap = {};
            const fetches = [];
            for (const id of allIds) {
                fetches.push(
                    fetch(`/data/ranks/${id}.json`)
                        .then(r => r.ok ? r.json() : null)
                        .then(d => { if (d) rankDataMap[id] = d; })
                        .catch(() => {})
                );
            }
            await Promise.all(fetches);

            // Parse abilities
            const ab1 = [];
            for (const r of this.char1.ranks) {
                if (rankDataMap[r.id]) {
                    ab1.push(...parseAbilitiesFromRank(rankDataMap[r.id], r.rank));
                    r.title = rankDataMap[r.id].title;
                }
            }
            const ab2 = [];
            for (const r of this.char2.ranks) {
                if (rankDataMap[r.id]) {
                    ab2.push(...parseAbilitiesFromRank(rankDataMap[r.id], r.rank));
                    r.title = rankDataMap[r.id].title;
                }
            }

            // Create combatants
            const c1 = new Combatant(this.char1, ab1);
            const c2 = new Combatant(this.char2, ab2);

            // Run simulation
            const engine = new CombatEngine(c1, c2);
            const lines = engine.run();

            // Animate output
            logEl.textContent = '';
            let i = 0;
            const interval = setInterval(() => {
                if (i < lines.length) {
                    logEl.textContent += lines[i] + '\n';
                    logEl.scrollTop = logEl.scrollHeight;
                    i++;
                } else {
                    clearInterval(interval);
                    this.running = false;
                    btn.disabled = false;
                    btn.textContent = 'SIMULAR COMBATE';
                }
            }, 40);

        } catch (err) {
            logEl.textContent = 'Error: ' + err.message + '\n' + err.stack;
            this.running = false;
            btn.disabled = false;
            btn.textContent = 'SIMULAR COMBATE';
        }
    }

    clearLog() {
        document.getElementById('combat-log').textContent = 'Carga dos personajes y pulsa SIMULAR para comenzar.';
    }
}

// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
    new SimulatorApp();
});
