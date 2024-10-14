Vue.component('v-select-search', {
    template: `
      <div>
        <select class="selectpicker" v-model="selectedKey" @change="emitSelected">
          <option v-for="(value, key) in data" :key="key" :value="key">
            {{ value }}
          </option>
        </select>
      </div>
    `,
    props: {
      data: {
        type: Object,
        required: true
      },
      selected: {
        type: String,
        default: ''
      }
    },
    data() {
      return {
        selectedKey: this.selected
      };
    },
    methods: {
      emitSelected() {
        this.$emit('input', this.selectedKey);
      }
    },
    mounted() {
      $('.selectpicker').selectpicker({
        liveSearch: true,
        style: 'btn-light',
      });
      
      this.$watch('selectedKey', (newValue) => {
        this.$nextTick(() => {
          $('.selectpicker').selectpicker('val', newValue);
        });
      });
    },
    beforeDestroy() {
      $('.selectpicker').selectpicker('destroy');
    }
  });