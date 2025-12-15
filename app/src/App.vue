<template>
  <div class="app-frame">
    <router-view />
  </div>
  <FloatingButton @action="onHelpMenuClick" />
</template>

<script setup>
import FloatingButton from "./components/FloatingButton.vue";

function onHelpMenuClick(item) {
  if (item.id === "docs") window.open("https://share.philips.com/sites/component-library", "_blank");
  if (item.id === "bug") window.open("https://www.digitalcampaigncreator.philips.com/feedback", "_blank");
  if (item.id === "questions") window.open("https://engage.cloud.microsoft/main/org/philips.onmicrosoft.com/groups/eyJfdHlwZSI6Ikdyb3VwIiwiaWQiOiI2OTIyODc4OTc2MSJ9/new", "_blank");
  if (item.id === "contentstack") window.open("https://eu-app.contentstack.com/#!/login", "_blank");
}
</script>

<style>
/* Optional minimal reset */
body {
  margin: 0;
  font-family: sans-serif;
}
</style>
