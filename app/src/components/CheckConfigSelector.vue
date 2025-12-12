<script setup>
const model = defineModel(); // v-model:checkConfig

const options = [
  { key: "text", label: "Text comparison" },
  { key: "seo", label: "SEO" },
  { key: "links", label: "Link Checker" },
  { key: "visualComparisonDesktop", label: "Screenshot Desktop" },
  { key: "screenshotMobile", label: "Screenshot Mobile" }
];
</script>

<template>
  <div class="check-config">
    <h3>Checks</h3>
    <div v-for="opt in options" :key="opt.key">
      <label>
        <input type="checkbox" v-model="model[opt.key]" />
        {{ opt.label }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.check-config {
  border: 1px solid #ccc;
  padding: 12px;
  margin: 12px 0;
}
</style>
