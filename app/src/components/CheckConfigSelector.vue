<script setup>
const model = defineModel(); // v-model:checkConfig

const options = [
  { key: "visualComparisonDesktop", label: "Visual Comparison" },
  { key: "screenshotMobile", label: "Mobile View" },
  { key: "text", label: "Text Comparison" },
  { key: "links", label: "Link Checker" },
  { key: "seo", label: "SEO" }
];
</script>

<template>

  <div class="check-config">

    <div class="toggle-grid">
      <label v-for="opt in options" :key="opt.key" class="tgl">
        <input type="checkbox" v-model="model[opt.key]" />

        <span class="tgl__ui">
      <span class="tgl__text">{{ opt.label }}</span>

      <span class="tgl__switch" aria-hidden="true">
        <span class="tgl__track"></span>
        <span class="tgl__thumb"></span>
      </span>
    </span>
      </label>
    </div>

  </div>
</template>
