Vue.component('v-select-search', {
  template: `
       <div class="position-relative">
          <!-- Input field that also serves as the dropdown trigger -->
          <input
            type="text"
            class="form-control"
            v-model="searchQuery"
            @input="filterOptions"
            @focus="dropdownVisible = true"
            @blur="hideDropdown"
            :placeholder="placeholder"
          />
          
          <!-- Dropdown options, filtered based on user input -->
          <ul v-if="dropdownVisible" class="dropdown-menu show w-100 mt-0" 
          style="position: absolute; max-height: 400px; overflow-y: auto;">
            <li v-for="(option, index) in filteredOptions" :key="index" class="dropdown-item" @mousedown="selectOption(option)">
              {{ option.name }}
            </li>
            <!-- If no options match the search -->
            <li v-if="filteredOptions.length === 0" class="dropdown-item text-muted"></li>
          </ul>
        </div>
    `,
  props: {
    optionsobj: {
      type: Object, 
      required: true
    },
    placeholder: {
      type: String,
      default: ''
    }
  },
  data: function() {
    return {
      options: [], // Array of objects with key and name: [{ key: "k1", name: "n1" }, ...]
      searchQuery: '', // This will hold the search query from the input field
      filteredOptions: [], // Filtered options based on the search query
      selectedOption: '', // The value of the selected option
      dropdownVisible: false // Controls visibility of the dropdown
    };
  },
  mounted() {
    this.options = Object.keys(this.optionsobj).map(key => ({
      key: key,
      name: this.optionsobj[key].name
    }));
    // Set initial filtered options to the full list
    this.filteredOptions = this.options;
  },
  methods: {
    filterOptions() {
      const query = this.searchQuery.toLowerCase();
      this.filteredOptions = this.options.filter(option =>
        option.name.toLowerCase().includes(query)
      );
    },
    selectOption(option) {
      console.log("key: "+option.key);
      this.searchQuery = option.name; // Set input text to selected option's name
      this.$emit('selected-key', option.key); // Emit the selected option's key
      this.dropdownVisible = false; // Hide the dropdown after selection
    },
    // Hides the dropdown (delayed to allow the click to register)
    hideDropdown() {
      setTimeout(() => {
        this.dropdownVisible = false;
      }, 200);
    },
  },
  watch: {
    // Watch for changes in the options prop and reset the filtered list accordingly
    optionsobj(newOptions) {
      this.options = Object.keys(newOptions).map(key => ({
        key: key,
        name: newOptions[key].name
      }));
      this.filteredOptions = this.options;
    },
  },
  style:
    `.dropdown-menu {
        max-height: 200px;
        overflow-y: auto;
        padding: 0;
      }

      .dropdown-item {
        cursor: pointer;
      }

      .form-control {
        width: 100%;
        margin-bottom: 0;
      }`
});