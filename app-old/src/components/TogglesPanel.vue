<!--src/components/TogglesPanel.vue-->

<script setup>
import { computed } from "vue";

const props = defineProps({
  toggles: {
    type: Object,
    required: true
  },
  checkDefs: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(["update:toggles"]);

function updateToggle(key, value) {
  emit("update:toggles", {
    ...props.toggles,
    [key]: value
  });
}
</script>

<template>
  <div class="toggle-grid">
    <label
        v-for="d in checkDefs"
        :key="d.key"
        class="tgl"
        :title="d.label"
    >
      <input
          type="checkbox"
          :checked="toggles[d.key]"
          @change="updateToggle(d.key, $event.target.checked)"
      />

      <span class="tgl__ui">
        <span class="tgl__switch" aria-hidden="true">
          <span class="tgl__track"></span>
          <span class="tgl__thumb"></span>
        </span>
        <span class="tgl__text">{{ d.label }}</span>
      </span>
    </label>
  </div>
</template>
