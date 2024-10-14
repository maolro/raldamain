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
        str: {name: "FUE", value: 0},
        dex: {name: "DES", value: 0},
        con: {name: "CON", value: 0},
        itl: {name: "INT", value: 0},
        wis: {name: "SAB", value: 0},
        cha: {name: "CAR", value: 0}
    },
    talents: {},
    ranks: {},
    myranks: [],
    archetypes: {},
    myarch: [],
    attributes: {},
    eqList: {},
    equipment: {
        armor: {},
        mainHand: {},
        secondHand: {},
        head: {},
        gloves: {},
        leftArm: {},
        rightArm: {},
        neck: {},
        eyes: {},
        feet: {},
        waist: {},
        bag: []
    }
  },
  methods: {
    getData: function(obj, source) {
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
            console.error("Error fetching the talents JSON: ", error);
          });
    },
    getMod: function(talid){
        if(this.talents[talid].stat.includes("/")){
            mainstat = this.getMainStat(this.talents[talid].stat);
        }
        else{
            mainstat = this.talents[talid].stat;
        }
        return this.talents[talid].level + this.stats[mainstat].value;
    },
    getMainStat: function(statstring){
        stv = statstring.split("/");
        if(this.finalStats[stv[0]].value < this.finalStats[stv[1]].value){
            return stv[1];
        }
        return stv[0];
    },
    setRank: function(key, level, index){
        this.$set(this.myranks, index, { ...this.ranks[key] });
        this.myranks[index].rank = level;
    },
    addRank: function(){
        this.myranks.push({rank: 0});
    },
    removeRank: function(){
        this.myranks.pop();
    },
    handleRankLevelUpdate({ key, level, index }){
        this.setRank(key, level, index);
    },
    romanNum: function(num){
        switch(num){
            case 1: return "I";
            case 2: return "II";
            case 3: return "III";
            case 4: return "IV";
            case 5: return "V";
            case 6: return "VI";
            default: return "";
        }
    },
    getRank: function(id){
        res = 0;
        for(let i in this.myranks && res == 0){
            if(Object.keys(myranks[i])[0] == id){
                res = myranks[i];
            }
        }
        return res;
    },
    replaceTag: function processString(str, skill, rk) {
        stat = this.finalStats[this.ranks[skill].stat].value;
        const getDD = (rk) => {
            if(rk < 3) return "d6 ";
            else if(rk < 5) return "d8 ";
            else return "d10 ";
        }
        let result = str.replace(/RANGO/g, " "+rk)
                        .replace(/STAT/g, " "+stat)
                        .replace(/DD/g, getDD(rk))
                        .replace(/MOD/g, (rk+stat));
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
    atbCatString: function(cat){
        obArray = this.myatb[cat];
        return obArray.map(obj => {
            let formattedString = `<b>${obj.name}</b>`;
            if (obj.cost || obj.uses || obj.tags) {
                arr = [obj.cost, obj.uses, obj.tags];
                formattedString += ` (${arr.filter(Boolean).join("; ")})`;
            }
            formattedString += ": " + this.replaceTag(obj.description, obj.skill, obj.rank);    
            return formattedString;
        }).join("<br></br>");
    },
    formatCharacterInfo() {  
        toMd = (text) => {return text.replace(new RegExp("<br></br>", 'g'),"\n\n")};
        // Construct the formatted text
        return `
# ${this.charactername} (Nivel ${this.level})\n
****\n
**PV:** ${this.hp}\t**Vit:** ${this.vt}\t**Def:** ${this.def}\t**Crd:**\t**Vigor:**\t**Chi:**\n
**FUE:** ${this.finalStats.str.value}\t**DES:** ${this.finalStats.dex.value}\t**CON:** ${this.finalStats.con.value}\t**INT:** ${this.finalStats.itl.value}\t**SAB:** ${this.finalStats.wis.value}\t**CAR:** ${this.finalStats.cha.value}\n
****\n
**Talentos:** ${this.talstring}
**Rangos:** ${this.rkString}
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
      addItem(slot, id){

      }
    },
  computed: {
    statpoints: function(){
        statSum = 0;
        for(let key in this.stats){
            statSum += this.stats[key].value;
        }
        return 10 + parseInt(this.level) - statSum;
    },
    statlimit: function(){
        return Math.floor(3 + this.level/3);
    },
    talpoints: function(){
        talSum = 0;
        for(let key in this.talents){
            talSum += this.talents[key].level; 
        }
        return (2 + 2*parseInt(this.level) - talSum);
    },
    talentlimit: function(){
        level = this.level
        if(level < 5) return 2;
        else if(level < 8) return 3;
        else if(level < 11) return 4;
        else return 5;
    },
    hp: function(){
        return Math.floor(3 + (this.level-1)/3 + this.finalStats.con.value);
    },
    vt: function(){
        return (2 + this.level/1 + this.finalStats.con.value);
    },
    san: function(){
        return (2 + this.level/1 + this.finalStats.itl.value);
    },
    talstring: function(){
        res = [];
        for(let key in this.talents){
            if(this.talents[key].level > 0)
                res.push(this.talents[key].name + " + " + this.getMod(key));
        }
        return res.join(", ");
    },
    rankLimit: function(){
        return Math.floor(1 + (this.level-1)/3);
    },
    rkpoints: function(){
        rkSum = 0;
        for(let key in this.myranks){
            rkSum += this.myranks[key].rank; 
        }
        return (1 + parseInt(this.level) - rkSum);
    },
    rkString: function(){
        res = [];
        for(let key in this.myranks){
            if(this.myranks[key].rank != 0)
                res.push(this.myranks[key].name +" "+ this.romanNum(this.myranks[key].rank));
        }
        return res.join(", ");
    },
    myatb: function(){
        res = { passive: [], actions: [], reactions: []};
        for(let key in this.myranks){
            if(this.myranks[key].rank != 0){
                atlist = (this.myranks[key].attributes).split(",");
                for(let i in atlist){
                    atb = this.attributes[atlist[i]];
                    if(atb.rank <= this.myranks[key].rank){
                        atb.rank = this.myranks[key].rank;
                        switch(atb.type){
                            case "Pasiva": res.passive.push(atb);
                                break;
                            case "Accion": res.actions.push(atb);
                                break; 
                            case "Reaccion": res.reactions.push(atb);
                                break; 
                        }
                    }
                }
            }   
        }
        return res;
    },
    reserves: function(){
        chiRes = 0;
        staminaRes = 0;
        for(let i in this.myranks){
            rk = this.myranks[i];
            switch(rk.reserve){
                case "chi": chiRes += rk.rank + 2;
                    break;
                case "stamina/chi": chiRes += rk.rank;
                    staminaRes += rk.rank;
                    break;
                case "stamina": staminaRes += rk.rank + 2;
                    break;
            }
        }
        return {chi: chiRes, stamina: staminaRes};
    },
    finalStats: function(){
        statsRes = {
            str: {name: "FUE", value: this.stats.str.value},
            dex: {name: "DES", value: this.stats.dex.value},
            con: {name: "CON", value: this.stats.con.value},
            itl: {name: "INT", value: this.stats.itl.value},
            wis: {name: "SAB", value: this.stats.wis.value},
            cha: {name: "CAR", value: this.stats.cha.value}
        };
        if(this.equipment.armor.penalty != null && -statsRes.str.value > this.equipment.armor.penalty)
            statsRes.dex.value += this.equipment.armor.penalty;
        for(let i in this.myranks){
            rk = this.myranks[i];
            for(let j in rk.stats){
                bst = rk.stats[j];
                if(bst.rank <= rk.rank){
                    statsRes[bst.stat].value += bst.boost;
                }
            }
        }
        for(let i in this.myarch){
            ar = this.myarch[i];
            for(let j in ar.stats){
                bst = ar.stats[j];
                if(bst.level <= ar.level){
                    statsRes[bst.stat].value += bst.boost;
                }
            }
        }
        return statsRes;
    },
    def: function(){
        res = 0;
        if(this.equipment.armor.def != null)
            res += this.equipment.armor.def;
        return res;
    }
  },
  created() {
    this.getData("talents", './data/talents.json');
    this.getData("ranks", './data/ranks.json'); 
    this.getData("attributes", './data/attributes.json'); 
    this.getData("eqList", './data/equipment.json')
  },
  mounted(){

  }
});
