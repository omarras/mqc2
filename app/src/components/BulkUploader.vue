<script setup>
import { ref } from "vue";

/**
 * BulkUploader.vue (fixed)
 *
 * This component now owns:
 *  - the hidden file input
 *  - the browse trigger
 *
 * Emits:
 *  - change(file)
 *  - dragover
 *  - dragleave
 *  - drop
 */

const props = defineProps({
  fileName: { type: String, default: "" },
  isDragging: { type: Boolean, default: false }
});

const emit = defineEmits(["change", "dragover", "dragleave", "drop"]);

const fileInput = ref(null);

// Open native file picker
function openPicker() {
  fileInput.value?.click();
}

// When user selects a file
function handleFile(e) {
  const f = e.target.files?.[0] || null;
  emit("change", f);
}

// When user drops a file
function handleDrop(e) {
  emit("drop", e);
}
</script>

<template>
  <div class="field">
    <label>CSV file</label>

    <!-- Hidden native input -->
    <input
        ref="fileInput"
        type="file"
        accept=".csv"
        @change="handleFile"
        style="position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); clip-path:inset(50%); white-space:nowrap; border:0; padding:0; margin:-1px;"
    />

    <!-- Dropzone -->
    <div
        class="dropzone"
        :class="{ 'is-dragging': isDragging }"
        role="button"
        tabindex="0"
        aria-label="Upload CSV: drag and drop or click to browse"
        @click="openPicker"
        @keydown.enter.prevent="openPicker"
        @keydown.space.prevent="openPicker"
        @dragover.prevent="emit('dragover')"
        @dragleave="emit('dragleave')"
        @drop.prevent="handleDrop"
    >
      <div class="dz-title">Drag & Drop your CSV here</div>
      <div class="dz-sub">or click to browse files</div>

      <button type="button" class="browse-btn" @click.stop="openPicker">
        Browse Files
      </button>

      <div v-if="fileName" class="dz-file mono">{{ fileName }}</div>
    </div>
  </div>
</template>
