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
    //...characterData         // Spread the characterData object into Vue's data
  },
  methods: {
    // Add your methods to manipulate data here
  },
  computed: {
    // Add computed properties if necessary
  }
});
